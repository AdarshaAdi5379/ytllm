from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.db_models import User, Workspace
from app.middleware.rate_limit import limiter
from app.models import UserCreate, UserLogin, UserResponse, ProfileResponse, TokenResponse, ProfileUpdate, RefreshTokenResponse
from app.services.auth_service import hash_password, verify_password, create_token, decode_token, get_current_user, get_optional_user, security


router = APIRouter()


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        auth_provider=user.auth_provider,
    )


@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/minute")
async def register(request: Request, req: UserCreate, db: AsyncSession = Depends(get_db)):
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=422, detail={"error": "VALIDATION", "message": "Email and password are required."})

    if len(req.password) < 6:
        raise HTTPException(status_code=422, detail={"error": "WEAK_PASSWORD", "message": "Password must be at least 6 characters."})

    if req.confirm_password and req.password != req.confirm_password:
        raise HTTPException(status_code=422, detail={"error": "PASSWORD_MISMATCH", "message": "Passwords do not match."})

    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={"error": "EMAIL_EXISTS", "message": "An account with this email already exists."})

    user = User(
        email=email,
        password_hash=hash_password(req.password),
        auth_provider="legacy",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    ws = Workspace(name="My Workspace", owner_id=user.id)
    db.add(ws)
    await db.commit()

    token = create_token(user.id)
    return TokenResponse(access_token=token, user=_user_response(user))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, req: UserLogin, db: AsyncSession = Depends(get_db)):
    email = req.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail={"error": "INVALID_CREDENTIALS", "message": "Invalid email or password"})

    if not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "OAUTH_ACCOUNT",
                "message": "This account uses Google/GitHub sign-in. Please sign in with the OAuth button below.",
            },
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail={"error": "INVALID_CREDENTIALS", "message": "Invalid email or password"})

    if not user.auth_provider:
        user.auth_provider = "legacy"
        await db.commit()

    token = create_token(user.id)
    return TokenResponse(access_token=token, user=_user_response(user))


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_optional_user)):
    if not user:
        raise HTTPException(status_code=401, detail={"error": "NOT_AUTHENTICATED", "message": "Not authenticated"})
    return _user_response(user)


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    user: User = Depends(get_current_user),
):
    return ProfileResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        auth_provider=user.auth_provider,
        created_at=user.created_at.isoformat() if user.created_at else "",
        updated_at=user.updated_at.isoformat() if user.updated_at else "",
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail={"error": "TOKEN_EXPIRED", "message": "Token expired or invalid. Please log in again."},
        )
    new_token = create_token(payload["sub"])
    return RefreshTokenResponse(access_token=new_token)


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    req: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.display_name is not None:
        user.display_name = req.display_name.strip() or None
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url.strip() or None
    await db.commit()
    await db.refresh(user)
    return _user_response(user)
