import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.services.auth_service import get_current_user, verify_workspace_access
from app.db_models import User, Source
from app.models import SourceResponse
from app.services import embedding_service

router = APIRouter()


def _source_to_response(s: Source) -> SourceResponse:
    return SourceResponse(
        id=s.id,
        workspace_id=s.workspace_id,
        folder_id=s.folder_id,
        source_type=s.source_type,
        title=s.title,
        metadata_json=s.metadata_json,
        raw_text=s.raw_text,
        status=s.status,
        error_message=s.error_message,
        created_at=s.created_at.isoformat() if s.created_at else "",
        updated_at=s.updated_at.isoformat() if s.updated_at else "",
    )


@router.get("/", response_model=list[SourceResponse])
async def list_sources(
    workspace_id: str,
    folder_id: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)
    clauses = [Source.workspace_id == workspace_id]
    if folder_id == "__none__":
        clauses.append(Source.folder_id.is_(None))
    elif folder_id:
        clauses.append(Source.folder_id == folder_id)
    result = await db.execute(
        select(Source).where(*clauses).order_by(Source.created_at)
    )
    return [_source_to_response(s) for s in result.scalars().all()]


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(
    workspace_id: str,
    source_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)
    result = await db.execute(
        select(Source).where(Source.id == source_id, Source.workspace_id == workspace_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Source not found."})
    return _source_to_response(s)


@router.delete("/{source_id}")
async def delete_source(
    workspace_id: str,
    source_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)
    result = await db.execute(
        select(Source).where(Source.id == source_id, Source.workspace_id == workspace_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Source not found."})

    # Clean up ChromaDB vector index if this source has one
    try:
        meta = json.loads(s.metadata_json)
        video_id = meta.get("video_id", "") if isinstance(meta, dict) else ""
        if video_id:
            embedding_service.delete_index_files(video_id)
            embedding_service.delete_index(video_id)
    except (json.JSONDecodeError, TypeError):
        pass

    await db.delete(s)
    await db.commit()
    return {"status": "deleted"}
