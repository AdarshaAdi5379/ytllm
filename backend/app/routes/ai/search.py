import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user, verify_workspace_access
from app.db_models import User, Source, Folder
from app.models import SearchRequest, SearchResponse, SearchResult
from app.services import embedding_service


router = APIRouter()

SOURCE_TYPE_ICONS = {
    "youtube_video": "youtube",
    "pdf_document": "pdf",
    "website_page": "web",
    "github_repo": "github",
    "markdown_note": "md",
    "text_note": "text",
    "docx_document": "docx",
    "pptx_document": "pptx",
}


async def _keyword_search(
    db: AsyncSession,
    workspace_id: str,
    query: str,
    folder_ids: list[str] | None = None,
    source_type: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 20,
) -> list[dict]:
    """Fallback keyword search using SQL LIKE on raw_text."""
    clauses = [
        Source.workspace_id == workspace_id,
        Source.status == "ready",
    ]
    if folder_ids:
        clauses.append(Source.folder_id.in_(folder_ids))
    if source_type:
        clauses.append(Source.source_type == source_type)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            clauses.append(Source.created_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            clauses.append(Source.created_at <= dt_to)
        except ValueError:
            pass

    terms = [t.strip() for t in query.split() if len(t.strip()) > 2]
    if not terms:
        return []

    text_filters = [Source.raw_text.ilike(f"%{term}%") for term in terms]
    clauses.append(or_(*text_filters))

    result = await db.execute(select(Source).where(*clauses).limit(limit))
    sources = result.scalars().all()

    out = []
    for src in sources:
        text = src.raw_text or ""
        # Find first occurrence of any term and extract context window
        best_pos = -1
        for term in terms:
            pos = text.lower().find(term.lower())
            if pos >= 0 and (best_pos < 0 or pos < best_pos):
                best_pos = pos
        if best_pos >= 0:
            start = max(0, best_pos - 100)
            end = min(len(text), best_pos + 300)
            snippet = text[start:end].strip()
            if start > 0:
                snippet = "... " + snippet
            if end < len(text):
                snippet = snippet + " ..."
        else:
            snippet = text[:400].strip()

        out.append({
            "text": snippet,
            "source_id": src.id,
            "source_title": src.title,
            "source_type": src.source_type,
            "folder_id": src.folder_id,
            "created_at": src.created_at.isoformat() if src.created_at else "",
            "distance": 0.5,
            "chunk_index": None,
            "start_s": None,
            "end_s": None,
        })

    return out


@router.post("/", response_model=SearchResponse)
async def search_workspace(
    req: SearchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, req.workspace_id, user.id)

    folder_ids = req.folder_ids or ([req.folder_id] if req.folder_id else None)

    clauses = [
        Source.workspace_id == req.workspace_id,
        Source.status == "ready",
    ]
    if folder_ids:
        clauses.append(Source.folder_id.in_(folder_ids))
    if req.source_type:
        clauses.append(Source.source_type == req.source_type)
    if req.date_from:
        try:
            dt_from = datetime.fromisoformat(req.date_from)
            clauses.append(Source.created_at >= dt_from)
        except ValueError:
            pass
    if req.date_to:
        try:
            dt_to = datetime.fromisoformat(req.date_to)
            clauses.append(Source.created_at <= dt_to)
        except ValueError:
            pass

    src_result = await db.execute(select(Source).where(*clauses))
    sources = src_result.scalars().all()

    if not sources:
        return SearchResponse(results=[], total=0, method="vector")

    # Pre-load folder names for lookup
    folder_ids_in_use = {s.folder_id for s in sources if s.folder_id}
    folder_map: dict[str, str] = {}
    if folder_ids_in_use:
        folder_result = await db.execute(
            select(Folder).where(Folder.id.in_(folder_ids_in_use))
        )
        for f in folder_result.scalars().all():
            folder_map[f.id] = f.name

    collection_keys: list[str] = []
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
            "folder_id": src.folder_id,
            "folder_name": folder_map.get(src.folder_id or "") or "",
            "created_at": src.created_at.isoformat() if src.created_at else "",
        }

    raw_results = await embedding_service.search_across_collections(
        collection_keys, req.query,
    )

    results: list[SearchResult] = []
    seen_source_ids: set[str] = set()

    for r in raw_results:
        key = r.get("collection_key", "")
        info = source_lookup.get(key)
        if not info:
            continue
        seen_source_ids.add(info["source_id"])
        results.append(SearchResult(
            text=r.get("text", ""),
            source_id=info["source_id"],
            source_title=info["source_title"],
            source_type=info["source_type"],
            folder_id=info["folder_id"],
            folder_name=info["folder_name"],
            created_at=info["created_at"],
            chunk_index=r.get("chunk_index"),
            start_s=r.get("start_s"),
            end_s=r.get("end_s"),
            distance=r.get("distance", 1.0),
            match_type="vector",
        ))

    # Keyword fallback: if < 3 vector results, add keyword matches
    if len(results) < 3:
        keyword_results = await _keyword_search(
            db, req.workspace_id, req.query,
            folder_ids=folder_ids,
            source_type=req.source_type,
            date_from=req.date_from,
            date_to=req.date_to,
        )
        for kr in keyword_results:
            if kr["source_id"] not in seen_source_ids:
                seen_source_ids.add(kr["source_id"])
                results.append(SearchResult(
                    text=kr["text"],
                    source_id=kr["source_id"],
                    source_title=kr["source_title"],
                    source_type=kr["source_type"],
                    folder_id=kr.get("folder_id"),
                    folder_name=folder_map.get(kr.get("folder_id") or "") or "",
                    created_at=kr.get("created_at", ""),
                    distance=kr["distance"],
                    match_type="keyword",
                ))

    # Sort: vector results first, then keyword
    results.sort(key=lambda r: 0 if r.match_type == "vector" else 1)
    method = "hybrid" if any(r.match_type == "keyword" for r in results) else "vector"

    return SearchResponse(results=results, total=len(results), method=method)
