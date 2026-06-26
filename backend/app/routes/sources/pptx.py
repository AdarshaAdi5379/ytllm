import json
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.db_models import User, Source, Workspace, Folder
from app.models import SourceResponse
from app.services.auth_service import get_current_user
from app.services import embedding_service
from app.services.pptx_service import process_pptx
from app.services.task_service import create_task


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


@router.post("/import")
async def import_pptx_source(
    file: UploadFile = File(...),
    workspace_id: str = Form(...),
    folder_id: str | None = Form(None),
    title: str = Form(""),
    background: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws_result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id, Workspace.owner_id == user.id
        )
    )
    if not ws_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})

    if folder_id:
        folder_result = await db.execute(
            select(Folder).where(
                Folder.id == folder_id, Folder.workspace_id == workspace_id
            )
        )
        if not folder_result.scalar_one_or_none():
            raise HTTPException(status_code=422, detail={"error": "INVALID_FOLDER", "message": "Folder not found in workspace."})

    if not file.filename or not file.filename.lower().endswith((".pptx", ".ppt")):
        raise HTTPException(status_code=422, detail={"error": "INVALID_FILE", "message": "Only .pptx and .ppt files are supported."})

    file_bytes = await file.read()

    if background:
        async def _bg_import(task_id: str):
            async with async_session() as session:
                try:
                    pptx = process_pptx(file_bytes, title=title)
                    chunk_count = await embedding_service.index_transcript(pptx.index_key, pptx.text)
                    metadata_json = json.dumps({
                        "index_key": pptx.index_key,
                        "title": pptx.title,
                        "filename": file.filename,
                        "chunk_count": chunk_count,
                    })
                    existing = await session.execute(
                        select(Source).where(
                            Source.workspace_id == workspace_id,
                            Source.source_type == "pptx_document",
                            Source.metadata_json.contains(pptx.index_key),
                        )
                    )
                    source = existing.scalar_one_or_none()
                    if source:
                        source.raw_text = pptx.text
                        source.metadata_json = metadata_json
                        source.status = "ready"
                    else:
                        source = Source(
                            workspace_id=workspace_id,
                            folder_id=folder_id,
                            user_id=user.id,
                            source_type="pptx_document",
                            title=pptx.title,
                            metadata_json=metadata_json,
                            raw_text=pptx.text,
                            status="ready",
                        )
                        session.add(source)
                    await session.commit()
                except Exception as e:
                    logger.exception("Background PPTX import error: {}", str(e))
                    raise

        task_id = await create_task("pptx_import", file.filename or "PPTX file", _bg_import)
        return {"task_id": task_id, "status": "queued", "source_type": "pptx_document"}

    try:
        pptx = process_pptx(file_bytes, title=title)

        chunk_count = await embedding_service.index_transcript(pptx.index_key, pptx.text)

        metadata_json = json.dumps({
            "index_key": pptx.index_key,
            "title": pptx.title,
            "filename": file.filename,
            "chunk_count": chunk_count,
        })

        existing = await db.execute(
            select(Source).where(
                Source.workspace_id == workspace_id,
                Source.source_type == "pptx_document",
                Source.metadata_json.contains(pptx.index_key),
            )
        )
        source = existing.scalar_one_or_none()
        if source:
            source.raw_text = pptx.text
            source.metadata_json = metadata_json
            source.status = "ready"
        else:
            source = Source(
                workspace_id=workspace_id,
                folder_id=folder_id,
                user_id=user.id,
                source_type="pptx_document",
                title=pptx.title,
                metadata_json=metadata_json,
                raw_text=pptx.text,
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
        logger.exception("PPTX import error: {}", str(e))
        raise HTTPException(
            status_code=503,
            detail={"error": "IMPORT_FAILED", "message": "Failed to import PPTX file."},
        )
