import json
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import User, Source, Workspace, Folder
from app.models import SourceResponse
from app.services.auth_service import get_current_user
from app.services import embedding_service
from app.services.website_service import fetch_webpage, url_to_index_key


router = APIRouter()


class WebsiteImportRequest(BaseModel):
    url: str
    workspace_id: str
    folder_id: str | None = None


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


@router.post("/import", response_model=SourceResponse)
async def import_website_source(
    req: WebsiteImportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws_result = await db.execute(
        select(Workspace).where(
            Workspace.id == req.workspace_id, Workspace.owner_id == user.id
        )
    )
    if not ws_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})

    if req.folder_id:
        folder_result = await db.execute(
            select(Folder).where(
                Folder.id == req.folder_id, Folder.workspace_id == req.workspace_id
            )
        )
        if not folder_result.scalar_one_or_none():
            raise HTTPException(status_code=422, detail={"error": "INVALID_FOLDER", "message": "Folder not found in workspace."})

    try:
        page = await fetch_webpage(req.url)
        index_key = url_to_index_key(req.url)

        chunk_count = await embedding_service.index_transcript(index_key, page.text)

        metadata_json = json.dumps({
            "index_key": index_key,
            "url": page.url,
            "site_name": page.site_name,
            "title": page.title,
            "chunk_count": chunk_count,
        })

        existing = await db.execute(
            select(Source).where(
                Source.workspace_id == req.workspace_id,
                Source.source_type == "website_page",
                Source.metadata_json.contains(index_key),
            )
        )
        source = existing.scalar_one_or_none()
        if source:
            source.raw_text = page.text
            source.metadata_json = metadata_json
            source.status = "ready"
        else:
            source = Source(
                workspace_id=req.workspace_id,
                folder_id=req.folder_id,
                user_id=user.id,
                source_type="website_page",
                title=page.title,
                metadata_json=metadata_json,
                raw_text=page.text,
                status="ready",
            )
            db.add(source)

        await db.commit()
        await db.refresh(source)
        return _source_to_response(source)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"error": "EXTRACTION_FAILED", "message": str(e)})
    except Exception as e:
        logger.exception("Website import error: {}", str(e))
        raise HTTPException(
            status_code=503,
            detail={"error": "IMPORT_FAILED", "message": "Failed to import website content."},
        )
