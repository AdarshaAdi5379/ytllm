from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.services.auth_service import get_optional_user
from app.db_models import User

router = APIRouter()


@router.get("/")
async def list_notes(
    source_id: str | None = None,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """List notes. [Not implemented]"""
    return {"status": "not_implemented", "message": "Notes listing coming in V2"}


@router.post("/")
async def create_note(
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a note. [Not implemented]"""
    return {"status": "not_implemented", "message": "Note creation coming in V2"}


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a note. [Not implemented]"""
    return {"status": "not_implemented", "message": "Note deletion coming in V2"}
