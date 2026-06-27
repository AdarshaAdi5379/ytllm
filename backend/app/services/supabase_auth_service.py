import base64
import jwt as pyjwt
from datetime import datetime
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jwt import PyJWKClient

from app.config import config
from app.db_models import User, Workspace

SUPABASE_JWT_ALGORITHM = "HS256"
_JWKS_CLIENT: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _JWKS_CLIENT
    if _JWKS_CLIENT is not None:
        return _JWKS_CLIENT
    supabase_url = config.get("supabase_url")
    if not supabase_url:
        return None
    try:
        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        _JWKS_CLIENT = PyJWKClient(jwks_url, cache_keys=True)
        return _JWKS_CLIENT
    except Exception as e:
        logger.warning("Failed to create JWKS client: {}", e)
        return None


def verify_supabase_token(token: str) -> dict | None:
    """Verify a Supabase JWT locally.

    Supports both HS256 (symmetric, uses SUPABASE_JWT_SECRET) and
    ES256 (asymmetric, uses JWKS public key from Supabase).

    Returns the decoded payload dict (with sub, email, user_metadata, etc.)
    or None if the token is invalid. Expired tokens return a dict with
    an 'expired' key set to True.
    """
    logger.info("verify_supabase_token: token_prefix={}... len={}", token[:20], len(token))

    raw_secret = config.get("supabase_jwt_secret")

    # Try HS256 with raw UTF-8 secret first (most common Supabase setup)
    if raw_secret:
        secret = raw_secret.encode("utf-8")
        result = _decode_hs256(token, secret)
        if result is not None:
            return result
        if result is None and _is_expired_hs256(token, secret):
            return {"expired": True}

    # Try HS256 with base64-decoded secret (some installations decode the secret)
    if raw_secret:
        try:
            b64_secret = base64.b64decode(raw_secret)
            if b64_secret != raw_secret.encode("utf-8"):
                result = _decode_hs256(token, b64_secret)
                if result is not None:
                    return result
        except Exception:
            pass

    # Try ES256 via JWKS (modern Supabase GoTrue)
    result = _decode_es256(token)
    if result is not None:
        return result

    logger.warning("Supabase token verification failed for token_prefix={}...", token[:20])
    return None


def _is_expired_hs256(token: str, secret: bytes) -> bool:
    """Check if an HS256 token is expired without throwing on other errors."""
    try:
        pyjwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False, "verify_exp": False})
        payload = pyjwt.decode(
            token, secret, algorithms=["HS256"],
            options={"verify_aud": False, "verify_exp": True},
        )
        return False
    except pyjwt.ExpiredSignatureError:
        return True
    except pyjwt.PyJWTError:
        return False


def _decode_hs256(token: str, secret: bytes) -> dict | None:
    """Try to decode a Supabase JWT with HS256 using the given secret bytes."""
    try:
        decoded = pyjwt.decode(
            token, secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        logger.info("HS256 token verified. sub={}, email={}",
                     decoded.get("sub"), decoded.get("email"))
        return decoded
    except pyjwt.ExpiredSignatureError:
        logger.warning("Supabase token expired (HS256): token_prefix={}...", token[:20])
        return None
    except pyjwt.PyJWTError as e:
        logger.debug("HS256 decode failed for token_prefix={}...: {} {}",
                      token[:20], type(e).__name__, e)
        return None


def _decode_es256(token: str) -> dict | None:
    """Try to decode a Supabase JWT with ES256 using JWKS."""
    try:
        client = _get_jwks_client()
        if client is None:
            logger.debug("No JWKS client available for ES256 verification")
            return None
        signing_key = client.get_signing_key_from_jwt(token)
        decoded = pyjwt.decode(
            token, signing_key.key,
            algorithms=["ES256"],
            options={"verify_aud": False},
        )
        logger.info("ES256 token verified. sub={}, email={}",
                     decoded.get("sub"), decoded.get("email"))
        return decoded
    except pyjwt.ExpiredSignatureError:
        logger.warning("Supabase token expired (ES256): token_prefix={}...", token[:20])
        return None
    except pyjwt.PyJWTError as e:
        logger.debug("ES256 decode failed: {} {}", type(e).__name__, e)
        return None
    except Exception as e:
        logger.debug("JWKS error for ES256 decode: {} {}", type(e).__name__, e)
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
    app_metadata = supabase_payload.get("app_metadata", {})
    display_name = metadata.get("full_name") or metadata.get("name") or ""
    avatar_url = metadata.get("avatar_url") or ""

    # Determine auth provider from Supabase token metadata
    raw_provider = app_metadata.get("provider") or metadata.get("provider") or ""
    if raw_provider == "email":
        auth_provider = "supabase_email"
    elif raw_provider:
        auth_provider = raw_provider
    else:
        auth_provider = "supabase"

    result = await db.execute(
        select(User).where(User.supabase_user_id == supabase_user_id)
    )
    user = result.scalar_one_or_none()

    if user:
        user.email = email
        user.auth_provider = auth_provider
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
            existing.auth_provider = auth_provider
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
            auth_provider=auth_provider,
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

    Returns None if the token is invalid or expired.
    """
    payload = verify_supabase_token(token)
    if payload is None or payload.get("expired"):
        return None
    return await upsert_local_user(db, payload)
