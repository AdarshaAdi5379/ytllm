from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.services.auth_service import get_optional_user
from app.db_models import User

router = APIRouter()


@router.post("/")
async def smart_search(
    workspace_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Smart search across all sources in a workspace. [Not implemented]"""
    return {"status": "not_implemented", "message": "Smart search coming in V2"}
