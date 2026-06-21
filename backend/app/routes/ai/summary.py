from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user, get_optional_user
from app.db_models import User, Source, Summary
from app.services import summary_service

router = APIRouter()

SUMMARY_TYPES = ("short", "detailed", "executive", "eli5", "interview", "revision")


class SummaryResponse(BaseModel):
    id: str
    source_id: str
    type: str
    content: str
    created_at: str


@router.get("/{source_id}", response_model=list[SummaryResponse])
async def list_summaries(
    source_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """List all summaries for a source."""
    source_result = await db.execute(select(Source).where(Source.id == source_id))
    source = source_result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Source not found."})

    result = await db.execute(
        select(Summary).where(Summary.source_id == source_id).order_by(Summary.created_at)
    )
    return [
        SummaryResponse(
            id=s.id,
            source_id=s.source_id,
            type=s.type,
            content=s.content,
            created_at=s.created_at.isoformat() if s.created_at else "",
        )
        for s in result.scalars().all()
    ]


@router.post("/generate/{source_id}", response_model=SummaryResponse)
async def generate_summary(
    source_id: str,
    summary_type: str = Query("short", description="Summary type: short, detailed, executive, eli5, interview, revision"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a summary for a source."""
    if summary_type not in SUMMARY_TYPES:
        raise HTTPException(
            status_code=422,
            detail={"error": "INVALID_TYPE", "message": f"Summary type must be one of: {', '.join(SUMMARY_TYPES)}"},
        )

    source_result = await db.execute(select(Source).where(Source.id == source_id))
    source = source_result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Source not found."})
    if source.status != "ready":
        raise HTTPException(status_code=422, detail={"error": "NOT_READY", "message": "Source is not ready yet."})

    existing = await db.execute(
        select(Summary).where(
            Summary.source_id == source_id,
            Summary.type == summary_type,
        )
    )
    existing_summary = existing.scalar_one_or_none()
    if existing_summary:
        return SummaryResponse(
            id=existing_summary.id,
            source_id=existing_summary.source_id,
            type=existing_summary.type,
            content=existing_summary.content,
            created_at=existing_summary.created_at.isoformat() if existing_summary.created_at else "",
        )

    raw_text = source.raw_text or ""
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail={"error": "NO_CONTENT", "message": "Source has no content to summarize."})

    try:
        content = await summary_service.generate_summary(
            source.source_type, source.title, raw_text, summary_type
        )
    except Exception as e:
        logger.exception("Summary generation failed: {}", str(e))
        raise HTTPException(status_code=503, detail={"error": "GENERATION_FAILED", "message": "Failed to generate summary."})

    summary = Summary(source_id=source_id, type=summary_type, content=content)
    db.add(summary)
    await db.commit()
    await db.refresh(summary)

    return SummaryResponse(
        id=summary.id,
        source_id=summary.source_id,
        type=summary.type,
        content=summary.content,
        created_at=summary.created_at.isoformat() if summary.created_at else "",
    )


@router.delete("/{source_id}/{summary_type}")
async def delete_summary(
    source_id: str,
    summary_type: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a specific summary."""
    result = await db.execute(
        select(Summary).where(
            Summary.source_id == source_id,
            Summary.type == summary_type,
        )
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Summary not found."})

    await db.delete(summary)
    await db.commit()
    return {"status": "deleted"}
