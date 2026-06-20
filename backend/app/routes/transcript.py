import asyncio
import time
from fastapi import APIRouter, Depends, HTTPException, Response
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import Video as VideoModel
from app.services.auth_service import get_optional_user
from app.db_models import User
from app.utils.youtube_parser import extract_video_id
from app.services import transcript_service
from app.services import embedding_service
from app.services import llm_service
from app.utils import session_cache
from app.config import config


router = APIRouter()


class TranscriptRequest(BaseModel):
    url: str


@router.post("/")
async def load_transcript(
    req: TranscriptRequest,
    res: Response,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Load and index a YouTube video transcript."""
    started = time.perf_counter()
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "INVALID_URL",
                "message": "Could not extract a valid YouTube video ID from the provided URL.",
            },
        )

    try:
        # Fetch video metadata and transcript concurrently
        fetch_started = time.perf_counter()
        metadata_task = transcript_service.fetch_video_metadata(video_id)
        transcript_task = transcript_service.fetch_transcript(video_id)

        metadata, transcript_result = await asyncio.gather(
            metadata_task, transcript_task
        )
        fetch_ms = int((time.perf_counter() - fetch_started) * 1000)

        transcript = transcript_result.text

        summary = ""
        suggested_questions = []
        enrich_ms = 0
        if config.get("enable_llm_enrichment"):
            # Generate summary and suggested questions concurrently
            enrich_started = time.perf_counter()
            summary_task = llm_service.generate_transcript_summary(
                transcript, metadata.title
            )
            questions_task = llm_service.generate_suggested_questions(
                transcript, metadata.title
            )

            summary, suggested_questions = await asyncio.gather(
                summary_task, questions_task
            )
            enrich_ms = int((time.perf_counter() - enrich_started) * 1000)

        # Build system prompt
        system_prompt = llm_service.build_system_prompt(
            metadata.title,
            metadata.channel_name,
            metadata.duration,
            summary,
        )

        # Index transcript chunks for semantic search
        index_started = time.perf_counter()
        chunk_count = await embedding_service.index_transcript_segments(
            video_id, transcript_result.segments, transcript
        )
        index_ms = int((time.perf_counter() - index_started) * 1000)

        # Store session data for export
        session_cache.session_cache.set(
            video_id,
            {
                "video_id": video_id,
                "transcript": transcript,
                "title": metadata.title,
                "channel_name": metadata.channel_name,
                "duration": metadata.duration,
                "thumbnail_url": metadata.thumbnail_url,
                "summary": summary,
            },
        )

        total_ms = int((time.perf_counter() - started) * 1000)

        # Auto-save to DB if user is authenticated
        if user is not None:
            existing = await db.execute(
                select(VideoModel).where(
                    VideoModel.user_id == user.id,
                    VideoModel.youtube_video_id == video_id,
                )
            )
            if not existing.scalar_one_or_none():
                db_video = VideoModel(
                    user_id=user.id,
                    youtube_video_id=video_id,
                    title=metadata.title,
                    channel_name=metadata.channel_name,
                    duration=metadata.duration,
                    thumbnail_url=metadata.thumbnail_url,
                    transcript=transcript,
                    summary=summary,
                    system_prompt=system_prompt,
                )
                db.add(db_video)
                await db.commit()

        return {
            "video_id": video_id,
            "title": metadata.title,
            "channel_name": metadata.channel_name,
            "duration": metadata.duration,
            "thumbnail_url": metadata.thumbnail_url,
            "transcript": transcript,
            "summary": summary,
            "suggested_questions": suggested_questions,
            "system_prompt": system_prompt,
            "chunk_count": chunk_count,
            "timings_ms": {
                "fetch_metadata_and_transcript": fetch_ms,
                "generate_summary_and_questions": enrich_ms,
                "index_embeddings": index_ms,
                "total": total_ms,
            },
        }

    except Exception as e:
        error_msg = str(e)
        logger.exception("Transcript fetch error: {}", error_msg)

        # Handle specific error cases
        if hasattr(e, "code") and e.code == "NO_CAPTIONS":
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "NO_CAPTIONS",
                    "message": "This video has no available captions. Only videos with auto-generated or manual captions are supported.",
                },
            )

        if "rate limit" in error_msg.lower() or "429" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "RATE_LIMITED",
                    "message": "API rate limit reached. Please wait and try again.",
                },
            )

        if "youtube api quota" in error_msg.lower() or ("quota" in error_msg.lower() and "youtube" in error_msg.lower()):
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "QUOTA_EXCEEDED",
                    "message": "Daily YouTube API quota reached. Please try again tomorrow.",
                },
            )

        if "api key" in error_msg.lower() or "401" in error_msg or "invalid" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "INVALID_API_KEY",
                    "message": "API key is missing, expired, or invalid. Please set a valid OPENAI_API_KEY in the backend/.env file.",
                },
            )

        if "insufficient_quota" in error_msg.lower() or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "QUOTA_EXCEEDED",
                    "message": "API quota exceeded. Please check your billing plan and usage limits.",
                },
            )

        raise HTTPException(
            status_code=503,
            detail={
                "error": "FETCH_FAILED",
                "message": "Failed to fetch video information. Please check the URL and try again.",
            },
        )
