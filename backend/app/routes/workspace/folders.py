from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.services.auth_service import get_optional_user
from app.db_models import User

router = APIRouter()


@router.get("/")
async def list_folders(
    workspace_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """List folders in a workspace. [Not implemented]"""
    return {"status": "not_implemented", "message": "Folder listing coming in V2"}


@router.post("/")
async def create_folder(
    workspace_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a folder in a workspace. [Not implemented]"""
    return {"status": "not_implemented", "message": "Folder creation coming in V2"}


@router.delete("/{folder_id}")
async def delete_folder(
    workspace_id: str,
    folder_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a folder. [Not implemented]"""
    return {"status": "not_implemented", "message": "Folder deletion coming in V2"}


@router.patch("/{folder_id}")
async def update_folder(
    workspace_id: str,
    folder_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a folder. [Not implemented]"""
    return {"status": "not_implemented", "message": "Folder updates coming in V2"}
