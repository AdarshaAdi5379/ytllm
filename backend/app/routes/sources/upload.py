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
from app.services.task_service import create_task


router = APIRouter()


SUPPORTED_EXTENSIONS = {
    ".pdf": "pdf_document",
    ".docx": "docx_document",
    ".pptx": "pptx_document",
    ".ppt": "pptx_document",
    ".txt": "text_note",
    ".md": "markdown_note",
}

MAX_FILE_SIZE = 50 * 1024 * 1024


def _detect_source_type(filename: str, content: bytes) -> str:
    """Detect source type from filename extension and magic bytes."""
    ext = (filename or "").lower()
    for suffix, source_type in SUPPORTED_EXTENSIONS.items():
        if ext.endswith(suffix):
            break
    else:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "UNSUPPORTED_FILE",
                "message": f"Unsupported file type. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
            },
        )

    # Validate with magic bytes
    if source_type == "pdf_document" and not content[:4] == b"%PDF":
        raise HTTPException(
            status_code=422,
            detail={"error": "INVALID_FILE", "message": "File extension is .pdf but content is not a valid PDF."},
        )
    if source_type in ("docx_document", "pptx_document") and not content[:2] == b"PK":
        raise HTTPException(
            status_code=422,
            detail={"error": "INVALID_FILE", "message": "File appears corrupted or is not a valid Office document."},
        )

    return source_type


def _title_from_filename(filename: str) -> str:
    """Extract a human-readable title from a filename."""
    name = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    name = name.rsplit(".", 1)[0] if "." in name else name
    return name.replace("_", " ").replace("-", " ").strip() or "Untitled"


@router.post("/import")
async def upload_document(
    file: UploadFile = File(...),
    workspace_id: str = Form(...),
    folder_id: str | None = Form(None),
    title: str = Form(""),
    background: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document (PDF, DOCX, PPTX, TXT, MD) and import as a source."""
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

    if not file.filename:
        raise HTTPException(status_code=422, detail={"error": "NO_FILE", "message": "No file provided."})

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=422,
            detail={"error": "FILE_TOO_LARGE", "message": f"File exceeds the {MAX_FILE_SIZE // (1024 * 1024)}MB size limit."},
        )

    source_type = _detect_source_type(file.filename, file_bytes)
    effective_title = title.strip() or _title_from_filename(file.filename)

    if background:
        async def _bg_import(task_id: str):
            async with async_session() as session:
                try:
                    result = _process_file(file_bytes, effective_title, source_type)
                    chunk_count = await embedding_service.index_transcript(result["index_key"], result["text"])
                    metadata_json = _build_metadata(source_type, result, file.filename, chunk_count)

                    existing = await session.execute(
                        select(Source).where(
                            Source.workspace_id == workspace_id,
                            Source.source_type == source_type,
                            Source.metadata_json.contains(result["index_key"]),
                        )
                    )
                    source = existing.scalar_one_or_none()
                    if source:
                        source.raw_text = result["text"]
                        source.metadata_json = metadata_json
                        source.status = "ready"
                    else:
                        source = Source(
                            workspace_id=workspace_id,
                            folder_id=folder_id,
                            user_id=user.id,
                            source_type=source_type,
                            title=effective_title,
                            metadata_json=metadata_json,
                            raw_text=result["text"],
                            status="ready",
                        )
                        session.add(source)
                    await session.commit()
                except HTTPException:
                    raise
                except ValueError as e:
                    raise HTTPException(status_code=422, detail={"error": "EXTRACTION_FAILED", "message": str(e)})
                except Exception as e:
                    logger.exception("Background document upload error: {}", str(e))
                    raise

        task_id = await create_task("document_upload", file.filename, _bg_import)
        return {"task_id": task_id, "status": "queued", "source_type": source_type}

    try:
        result = _process_file(file_bytes, effective_title, source_type)
        chunk_count = await embedding_service.index_transcript(result["index_key"], result["text"])
        metadata_json = _build_metadata(source_type, result, file.filename, chunk_count)

        existing = await db.execute(
            select(Source).where(
                Source.workspace_id == workspace_id,
                Source.source_type == source_type,
                Source.metadata_json.contains(result["index_key"]),
            )
        )
        source = existing.scalar_one_or_none()
        if source:
            source.raw_text = result["text"]
            source.metadata_json = metadata_json
            source.status = "ready"
        else:
            source = Source(
                workspace_id=workspace_id,
                folder_id=folder_id,
                user_id=user.id,
                source_type=source_type,
                title=effective_title,
                metadata_json=metadata_json,
                raw_text=result["text"],
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
        logger.exception("Document upload error: {}", str(e))
        raise HTTPException(
            status_code=503,
            detail={"error": "IMPORT_FAILED", "message": "Failed to import document."},
        )


def _process_file(file_bytes: bytes, title: str, source_type: str) -> dict:
    """Dispatch file processing to the appropriate service based on source_type."""
    if source_type == "pdf_document":
        from app.services.pdf_service import process_pdf_bytes
        pdf = process_pdf_bytes(file_bytes, filename=title)
        return {"text": pdf.text, "index_key": pdf.index_key, "page_count": pdf.page_count}

    elif source_type == "docx_document":
        from app.services.docx_service import process_docx
        docx = process_docx(file_bytes, title=title)
        return {"text": docx.text, "index_key": docx.index_key}

    elif source_type == "pptx_document":
        from app.services.pptx_service import process_pptx
        pptx = process_pptx(file_bytes, title=title)
        return {"text": pptx.text, "index_key": pptx.index_key}

    elif source_type == "text_note":
        from app.services.text_service import process_text
        content = file_bytes.decode("utf-8", errors="replace")
        txt = process_text(content, title=title)
        return {"text": txt.text, "index_key": txt.index_key}

    elif source_type == "markdown_note":
        from app.services.markdown_service import process_markdown
        content = file_bytes.decode("utf-8", errors="replace")
        md = process_markdown(content, title=title)
        return {"text": md.text, "index_key": md.index_key}

    raise HTTPException(status_code=422, detail={"error": "UNSUPPORTED_TYPE", "message": f"Unsupported source type: {source_type}"})


def _build_metadata(source_type: str, result: dict, filename: str, chunk_count: int) -> str:
    base = {
        "index_key": result["index_key"],
        "title": result.get("title", ""),
        "filename": filename,
        "chunk_count": chunk_count,
    }
    if "page_count" in result:
        base["page_count"] = result["page_count"]
    return json.dumps(base)


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
