import bcrypt
import jwt as pyjwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import config
from app.database import get_db
from app.db_models import User, WorkspaceMember, Workspace

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=config["jwt_expire_minutes"])
    payload = {"sub": user_id, "exp": expire}
    return pyjwt.encode(payload, config["jwt_secret"], algorithm=config["jwt_algorithm"])


def decode_token(token: str) -> dict | None:
    try:
        return pyjwt.decode(token, config["jwt_secret"], algorithms=[config["jwt_algorithm"]])
    except pyjwt.PyJWTError:
        return None


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def check_workspace_access(
    db: AsyncSession, workspace_id: str, user_id: str, required_roles: tuple[str, ...] = ("owner", "admin", "editor", "viewer"),
) -> str | None:
    """Return the user's role for a workspace if they have access, or None."""
    # Owner always has access
    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.owner_id == user_id)
    )
    if ws_result.scalar_one_or_none():
        return "owner"

    # Check membership
    member_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if member and member.role in required_roles:
        return member.role
    return None


async def require_workspace_role(
    db: AsyncSession, workspace_id: str, user_id: str, required_roles: tuple[str, ...] = ("owner", "admin", "editor", "viewer"),
) -> str:
    """Check workspace access and return role, or raise HTTPException."""
    role = await check_workspace_access(db, workspace_id, user_id, required_roles)
    if role is None:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})
    return role


WRITE_ROLES = ("owner", "admin", "editor")
READ_ROLES = ("owner", "admin", "editor", "viewer")
ADMIN_ROLES = ("owner", "admin")


async def verify_workspace_access(db: AsyncSession, workspace_id: str, user_id: str) -> Workspace:
    """Verify user has access to workspace (owner or member). Returns workspace or raises 404."""
    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    ws = ws_result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})
    if ws.owner_id == user_id:
        return ws
    member_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    if member_result.scalar_one_or_none():
        return ws
    raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})
