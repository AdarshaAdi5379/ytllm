from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user, verify_workspace_access
from app.db_models import User
from app.services import daily_revision_service

router = APIRouter()


@router.get("/summary")
async def get_daily_revision_summary(
    workspace_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)
    return await daily_revision_service.build_revision_summary(db, workspace_id, user.id)


@router.get("/suggestions")
async def get_revision_suggestions(
    workspace_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)
    text = await daily_revision_service.generate_revision_suggestions(db, workspace_id, user.id)
    return {"suggestions": text}
