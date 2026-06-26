import json
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.db_models import User, Source, Workspace, Folder
from app.models import SourceResponse
from app.services.auth_service import get_current_user
from app.services import embedding_service
from app.services.github_service import fetch_github_repo, url_to_index_key
from app.services.task_service import create_task
from app.config import config


router = APIRouter()


class GitHubImportRequest(BaseModel):
    url: str
    workspace_id: str
    folder_id: str | None = None
    token: str | None = None


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
async def import_github_source(
    req: GitHubImportRequest,
    background: bool = Query(False),
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

    gh_token = req.token or config.get("github_token") or None

    if background:
        async def _bg_import():
            async with async_session() as session:
                try:
                    repo = await fetch_github_repo(req.url, token=gh_token)
                    chunk_count = await embedding_service.index_code_chunks(repo.index_key, repo.chunks)
                    metadata_json = json.dumps({
                        "index_key": repo.index_key,
                        "owner": repo.owner,
                        "repo": repo.repo,
                        "branch": repo.branch,
                        "file_count": len(repo.files),
                        "chunk_count": chunk_count,
                    })
                    title = f"{repo.owner}/{repo.repo}"
                    existing = await session.execute(
                        select(Source).where(
                            Source.workspace_id == req.workspace_id,
                            Source.source_type == "github_repo",
                            Source.metadata_json.contains(repo.index_key),
                        )
                    )
                    source = existing.scalar_one_or_none()
                    if source:
                        source.raw_text = repo.text
                        source.metadata_json = metadata_json
                        source.status = "ready"
                    else:
                        source = Source(
                            workspace_id=req.workspace_id,
                            folder_id=req.folder_id,
                            user_id=user.id,
                            source_type="github_repo",
                            title=title,
                            metadata_json=metadata_json,
                            raw_text=repo.text,
                            status="ready",
                        )
                        session.add(source)
                    await session.commit()
                except Exception as e:
                    logger.exception("Background GitHub import error: {}", str(e))
                    raise

        task_id = await create_task("github_import", req.url, _bg_import())
        return {"task_id": task_id, "status": "queued", "source_type": "github_repo"}

    try:
        repo = await fetch_github_repo(req.url, token=gh_token)
        chunk_count = await embedding_service.index_code_chunks(repo.index_key, repo.chunks)

        metadata_json = json.dumps({
            "index_key": repo.index_key,
            "owner": repo.owner,
            "repo": repo.repo,
            "branch": repo.branch,
            "file_count": len(repo.files),
            "chunk_count": chunk_count,
        })

        title = f"{repo.owner}/{repo.repo}"
        existing = await db.execute(
            select(Source).where(
                Source.workspace_id == req.workspace_id,
                Source.source_type == "github_repo",
                Source.metadata_json.contains(repo.index_key),
            )
        )
        source = existing.scalar_one_or_none()
        if source:
            source.raw_text = repo.text
            source.metadata_json = metadata_json
            source.status = "ready"
        else:
            source = Source(
                workspace_id=req.workspace_id,
                folder_id=req.folder_id,
                user_id=user.id,
                source_type="github_repo",
                title=title,
                metadata_json=metadata_json,
                raw_text=repo.text,
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
        logger.exception("GitHub import error: {}", str(e))
        raise HTTPException(
            status_code=503,
            detail={"error": "IMPORT_FAILED", "message": "Failed to import GitHub repository."},
        )
