import json
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.db_models import User, Source, Workspace, Folder
from app.models import SourceResponse
from app.services.auth_service import get_current_user, verify_workspace_access
from app.services import embedding_service
from app.services.website_service import fetch_webpage, url_to_index_key
from app.services.task_service import create_task


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


@router.post("/import")
async def import_website_source(
    req: WebsiteImportRequest,
    background: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, req.workspace_id, user.id)

    effective_folder_id = (
        req.folder_id.strip()
        if req.folder_id and req.folder_id.strip() and req.folder_id.strip() not in ("null", "undefined", "__none__", "None")
        else None
    )

    if effective_folder_id:
        folder_result = await db.execute(
            select(Folder).where(
                Folder.id == effective_folder_id, Folder.workspace_id == req.workspace_id
            )
        )
        if not folder_result.scalar_one_or_none():
            raise HTTPException(status_code=422, detail={"error": "INVALID_FOLDER", "message": "Folder not found in workspace."})

    if background:
        async def _bg_import(task_id: str):
            async with async_session() as session:
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
                    existing = await session.execute(
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
                            folder_id=effective_folder_id,
                            user_id=user.id,
                            source_type="website_page",
                            title=page.title,
                            metadata_json=metadata_json,
                            raw_text=page.text,
                            status="ready",
                        )
                        session.add(source)
                    await session.commit()
                    await session.refresh(source)

                    try:
                        from app.services.mastery_service import auto_extract_and_sync_source_topics
                        await auto_extract_and_sync_source_topics(
                            db=session,
                            workspace_id=req.workspace_id,
                            source_id=source.id,
                            title=page.title,
                            source_type="website_page",
                            raw_text=page.text,
                        )
                    except Exception as e:
                        logger.warning("Failed to auto-extract topics on background website import: {}", e)
                except Exception as e:
                    logger.exception("Background website import error: {}", str(e))
                    raise

        task_id = await create_task("website_import", req.url, _bg_import)
        return {"task_id": task_id, "status": "queued", "source_type": "website_page"}

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
                folder_id=effective_folder_id,
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

        try:
            from app.services.mastery_service import auto_extract_and_sync_source_topics
            await auto_extract_and_sync_source_topics(
                db=db,
                workspace_id=req.workspace_id,
                source_id=source.id,
                title=page.title,
                source_type="website_page",
                raw_text=page.text,
            )
        except Exception as e:
            logger.warning("Failed to auto-extract topics on website import: {}", e)

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
