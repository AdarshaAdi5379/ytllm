from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.services.auth_service import get_optional_user
from app.db_models import User

router = APIRouter()


@router.post("/generate")
async def generate_summary(
    source_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a summary for a source. [Not implemented]"""
    return {"status": "not_implemented", "message": "Summary generation coming in V2"}


@router.get("/{source_id}")
async def list_summaries(
    source_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """List summaries for a source. [Not implemented]"""
    return {"status": "not_implemented", "message": "Summary listing coming in V2"}
