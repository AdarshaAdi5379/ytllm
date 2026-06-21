import json
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user
from app.db_models import User, Source, Workspace
from app.models import SearchRequest, SearchResponse, SearchResult
from app.services import embedding_service


router = APIRouter()


@router.post("/", response_model=SearchResponse)
async def search_workspace(
    req: SearchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws_result = await db.execute(
        select(Workspace).where(
            Workspace.id == req.workspace_id, Workspace.owner_id == user.id
        )
    )
    if not ws_result.scalar_one_or_none():
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Workspace not found."},
        )

    clauses = [
        Source.workspace_id == req.workspace_id,
        Source.status == "ready",
    ]
    if req.folder_id:
        clauses.append(Source.folder_id == req.folder_id)
    if req.source_type:
        clauses.append(Source.source_type == req.source_type)

    src_result = await db.execute(select(Source).where(*clauses))
    sources = src_result.scalars().all()

    if not sources:
        return SearchResponse(results=[], total=0)

    collection_keys: list[dict] = []
    source_lookup: dict[str, dict] = {}

    for src in sources:
        meta = {}
        try:
            meta = json.loads(src.metadata_json)
        except Exception:
            pass

        key = meta.get("video_id") or meta.get("index_key", "")
        if not key:
            continue

        collection_keys.append(key)
        source_lookup[key] = {
            "source_id": src.id,
            "source_title": src.title,
            "source_type": src.source_type,
        }

    raw_results = await embedding_service.search_across_collections(
        collection_keys, req.query,
    )

    results: list[SearchResult] = []
    for r in raw_results:
        key = r.get("collection_key", "")
        info = source_lookup.get(key)
        if not info:
            continue
        results.append(SearchResult(
            text=r.get("text", ""),
            source_id=info["source_id"],
            source_title=info["source_title"],
            source_type=info["source_type"],
            chunk_index=r.get("chunk_index"),
            start_s=r.get("start_s"),
            end_s=r.get("end_s"),
            distance=r.get("distance", 1.0),
        ))

    return SearchResponse(results=results, total=len(results))
