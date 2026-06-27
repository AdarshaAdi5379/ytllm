import jwt as pyjwt
from datetime import datetime
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import config
from app.db_models import User, Workspace

SUPABASE_JWT_ALGORITHM = "HS256"
SUPABASE_JWT_AUDIENCE = "authenticated"


def verify_supabase_token(token: str) -> dict | None:
    """Verify a Supabase JWT locally using the SUPABASE_JWT_SECRET.

    Returns the decoded payload dict (with sub, email, user_metadata, etc.)
    or None if the token is invalid, expired, or misconfigured.
    """
    secret = config.get("supabase_jwt_secret")
    if not secret:
        return None
    try:
        payload = pyjwt.decode(
            token,
            secret,
            algorithms=[SUPABASE_JWT_ALGORITHM],
            audience=SUPABASE_JWT_AUDIENCE,
        )
        return payload
    except pyjwt.ExpiredSignatureError:
        logger.debug("Supabase token expired")
        return None
    except pyjwt.PyJWTError as e:
        logger.debug("Supabase token verification failed: {}", e)
        return None


async def upsert_local_user(db: AsyncSession, supabase_payload: dict) -> User:
    """Create or update a local User record from a verified Supabase token payload.

    Matches on supabase_user_id first, then falls back to email for legacy account
    linking (users who registered with email/password before Supabase was configured).
    Creates a default 'My Workspace' for new users.
    Returns the local User record.
    """
    supabase_user_id = supabase_payload.get("sub", "")
    email = supabase_payload.get("email", "")
    metadata = supabase_payload.get("user_metadata", {})
    display_name = metadata.get("full_name") or metadata.get("name") or ""
    avatar_url = metadata.get("avatar_url") or ""

    result = await db.execute(
        select(User).where(User.supabase_user_id == supabase_user_id)
    )
    user = result.scalar_one_or_none()

    if user:
        user.email = email
        if display_name:
            user.display_name = display_name
        if avatar_url:
            user.avatar_url = avatar_url
    else:
        # Try linking to a legacy user by email (no supabase_user_id)
        result = await db.execute(
            select(User).where(User.email == email, User.supabase_user_id.is_(None))
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.supabase_user_id = supabase_user_id
            if display_name:
                existing.display_name = display_name
            if avatar_url:
                existing.avatar_url = avatar_url
            await db.commit()
            await db.refresh(existing)
            return existing

        user = User(
            supabase_user_id=supabase_user_id,
            email=email,
            display_name=display_name or None,
            avatar_url=avatar_url or None,
            password_hash=None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        ws = Workspace(name="My Workspace", owner_id=user.id)
        db.add(ws)
        await db.commit()
        await db.refresh(user)

    return user


async def get_local_user_from_supabase_token(
    token: str, db: AsyncSession
) -> User | None:
    """Verify a Supabase token and return the local user, upserting if needed.

    Returns None if the token is invalid.
    """
    payload = verify_supabase_token(token)
    if payload is None:
        return None
    return await upsert_local_user(db, payload)
