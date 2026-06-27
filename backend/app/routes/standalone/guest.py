from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.services.auth_service import get_current_user
from app.db_models import User, StandaloneSession
from app.models import ClaimGuestSessionsRequest

router = APIRouter()


@router.post("/claim")
async def claim_guest_sessions(
    req: ClaimGuestSessionsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not req.guest_token:
        raise HTTPException(
            status_code=422,
            detail={"error": "TOKEN_REQUIRED", "message": "Guest token is required."},
        )

    result = await db.execute(
        select(StandaloneSession).where(
            StandaloneSession.guest_token == req.guest_token,
            StandaloneSession.user_id.is_(None),
        )
    )
    sessions = result.scalars().all()

    for s in sessions:
        s.user_id = user.id
        s.guest_token = None

    await db.commit()

    return {"claimed": len(sessions)}
