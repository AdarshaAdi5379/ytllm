import json
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import or_, and_, select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.db_models import User, Source, Workspace, Folder
from app.models import SourceResponse
from app.services.auth_service import get_current_user
from app.services import embedding_service
from app.services.github_service import fetch_github_repo, fetch_github_file_tree_api, should_include_file
from app.services.task_service import create_task, update_task_progress
from app.config import config


router = APIRouter()


async def _find_existing_github_source(
    db: AsyncSession,
    workspace_id: str,
    index_key: str,
    owner: str,
    repo: str,
    branch: str,
) -> Source | None:
    result = await db.execute(
        select(Source).where(
            Source.workspace_id == workspace_id,
            Source.source_type == "github_repo",
            or_(
                Source.metadata_json.contains(index_key),
                and_(
                    Source.metadata_json.contains(f'"owner": "{owner}"'),
                    Source.metadata_json.contains(f'"repo": "{repo}"'),
                    Source.metadata_json.contains(f'"branch": "{branch}"'),
                ),
            ),
        )
    )
    return result.scalar_one_or_none()


class GitHubImportRequest(BaseModel):
    url: str
    workspace_id: str
    folder_id: str | None = None
    token: str | None = None
    file_paths: list[str] | None = None


class GitHubPreviewRequest(BaseModel):
    url: str
    token: str | None = None
    mode: str = "api"


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
    mode: str = Query("auto", pattern=r"^(auto|api|clone)$"),
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
        async def _bg_import(task_id: str):
            async with async_session() as session:
                try:
                    async def progress_cb(current: int, total: int, phase: str):
                        await update_task_progress(task_id, current, total, phase)

                    repo = await fetch_github_repo(
                        req.url, token=gh_token, mode=mode,
                        file_paths=req.file_paths, progress_callback=progress_cb,
                    )
                    chunk_count = await embedding_service.index_code_chunks(repo.index_key, repo.chunks)
                    metadata_json = json.dumps({
                        "index_key": repo.index_key,
                        "owner": repo.owner,
                        "repo": repo.repo,
                        "branch": repo.branch,
                        "file_count": len(repo.files),
                        "chunk_count": chunk_count,
                        "file_tree": repo.file_tree,
                    })
                    title = f"{repo.owner}/{repo.repo}"
                    source = await _find_existing_github_source(
                        session, req.workspace_id, repo.index_key,
                        repo.owner, repo.repo, repo.branch,
                    )
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

        task_id = await create_task("github_import", req.url, _bg_import)
        return {"task_id": task_id, "status": "queued", "source_type": "github_repo"}

    try:
        repo = await fetch_github_repo(req.url, token=gh_token, mode=mode, file_paths=req.file_paths)
        chunk_count = await embedding_service.index_code_chunks(repo.index_key, repo.chunks)

        metadata_json = json.dumps({
            "index_key": repo.index_key,
            "owner": repo.owner,
            "repo": repo.repo,
            "branch": repo.branch,
            "file_count": len(repo.files),
            "chunk_count": chunk_count,
            "file_tree": repo.file_tree,
        })

        title = f"{repo.owner}/{repo.repo}"
        source = await _find_existing_github_source(
            db, req.workspace_id, repo.index_key,
            repo.owner, repo.repo, repo.branch,
        )
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


@router.post("/preview")
async def preview_github_repo(req: GitHubPreviewRequest):
    """Preview a GitHub repo's file tree without importing content."""
    gh_token = req.token or config.get("github_token") or None
    try:
        file_tree, all_blob_paths, owner, repo, branch = await fetch_github_file_tree_api(
            req.url, token=gh_token,
        )
        code_paths = [p for p in all_blob_paths if should_include_file(p)]
        return {
            "url": req.url,
            "owner": owner,
            "repo": repo,
            "branch": branch,
            "file_tree": file_tree,
            "total_files": len(all_blob_paths),
            "importable_files": len(code_paths),
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"error": "PREVIEW_FAILED", "message": str(e)})


@router.get("/{source_id}/file-tree")
async def get_github_file_tree(
    source_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Source)
        .options(joinedload(Source.workspace))
        .where(
            Source.id == source_id,
            Source.source_type == "github_repo",
        )
    )
    source = result.scalars().first()
    if not source:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "GitHub source not found."})

    if source.workspace.owner_id != user.id:
        raise HTTPException(status_code=403, detail={"error": "FORBIDDEN", "message": "Access denied."})

    try:
        meta = json.loads(source.metadata_json) if source.metadata_json else {}
    except (json.JSONDecodeError, TypeError):
        meta = {}

    file_tree = meta.get("file_tree", [])
    return {"source_id": source_id, "file_tree": file_tree}
