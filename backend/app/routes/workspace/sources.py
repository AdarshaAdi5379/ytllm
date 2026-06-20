from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.services.auth_service import get_optional_user
from app.db_models import User

router = APIRouter()


@router.get("/")
async def list_sources(
    workspace_id: str,
    folder_id: str | None = None,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """List sources in a workspace (optionally filtered by folder). [Not implemented]"""
    return {"status": "not_implemented", "message": "Source listing coming in V2"}


@router.get("/{source_id}")
async def get_source(
    workspace_id: str,
    source_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single source. [Not implemented]"""
    return {"status": "not_implemented", "message": "Source detail coming in V2"}


@router.delete("/{source_id}")
async def delete_source(
    workspace_id: str,
    source_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a source and its chunks. [Not implemented]"""
    return {"status": "not_implemented", "message": "Source deletion coming in V2"}
