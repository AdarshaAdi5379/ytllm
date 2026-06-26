import asyncio
import json
import time
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.db_models import Video as VideoModel, Source, Workspace, Folder
from app.services.auth_service import get_optional_user, get_current_user
from app.db_models import User
from app.utils.youtube_parser import extract_video_id
from app.services import transcript_service
from app.services import embedding_service
from app.services import llm_service
from app.utils import session_cache
from app.config import config
from app.models import YouTubeImportRequest, SourceResponse
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


class TranscriptRequest(BaseModel):
    url: str


@router.post("/import")
async def import_youtube_source(
    req: YouTubeImportRequest,
    background: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a YouTube video transcript and save as a Source in a workspace folder."""
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(
            status_code=422,
            detail={"error": "INVALID_URL", "message": "Invalid YouTube URL."},
        )

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

    if background:
        async def _bg_import(task_id: str):
            async with async_session() as session:
                try:
                    metadata, transcript_result = await asyncio.gather(
                        transcript_service.fetch_video_metadata(video_id),
                        transcript_service.fetch_transcript(video_id),
                    )
                    transcript_text = transcript_result.text

                    summary = ""
                    if config.get("enable_llm_enrichment"):
                        summary = await llm_service.generate_transcript_summary(transcript_text, metadata.title)

                    chunk_count = await embedding_service.index_transcript_segments(
                        video_id, transcript_result.segments, transcript_text
                    )

                    metadata_json = json.dumps({
                        "video_id": video_id,
                        "channel_name": metadata.channel_name,
                        "duration": metadata.duration,
                        "thumbnail_url": metadata.thumbnail_url,
                        "summary": summary,
                        "chunk_count": chunk_count,
                    })

                    existing = await session.execute(
                        select(Source).where(
                            Source.workspace_id == req.workspace_id,
                            Source.source_type == "youtube_video",
                            Source.metadata_json.contains(video_id),
                        )
                    )
                    source = existing.scalar_one_or_none()
                    if source:
                        source.raw_text = transcript_text
                        source.metadata_json = metadata_json
                        source.status = "ready"
                    else:
                        source = Source(
                            workspace_id=req.workspace_id,
                            folder_id=req.folder_id,
                            user_id=user.id,
                            source_type="youtube_video",
                            title=metadata.title,
                            metadata_json=metadata_json,
                            raw_text=transcript_text,
                            status="ready",
                        )
                        session.add(source)

                    await session.commit()
                except Exception as e:
                    logger.exception("Background YouTube import error: {}", str(e))
                    raise

        task_id = await create_task("youtube_import", req.url, _bg_import)
        return {"task_id": task_id, "status": "queued", "source_type": "youtube_video"}

    try:
        metadata, transcript_result = await asyncio.gather(
            transcript_service.fetch_video_metadata(video_id),
            transcript_service.fetch_transcript(video_id),
        )
        transcript_text = transcript_result.text

        summary = ""
        if config.get("enable_llm_enrichment"):
            summary = await llm_service.generate_transcript_summary(transcript_text, metadata.title)

        chunk_count = await embedding_service.index_transcript_segments(
            video_id, transcript_result.segments, transcript_text
        )

        metadata_json = json.dumps({
            "video_id": video_id,
            "channel_name": metadata.channel_name,
            "duration": metadata.duration,
            "thumbnail_url": metadata.thumbnail_url,
            "summary": summary,
            "chunk_count": chunk_count,
        })

        existing = await db.execute(
            select(Source).where(
                Source.workspace_id == req.workspace_id,
                Source.source_type == "youtube_video",
                Source.metadata_json.contains(video_id),
            )
        )
        source = existing.scalar_one_or_none()
        if source:
            source.raw_text = transcript_text
            source.metadata_json = metadata_json
            source.status = "ready"
        else:
            source = Source(
                workspace_id=req.workspace_id,
                folder_id=req.folder_id,
                user_id=user.id,
                source_type="youtube_video",
                title=metadata.title,
                metadata_json=metadata_json,
                raw_text=transcript_text,
                status="ready",
            )
            db.add(source)

        await db.commit()
        await db.refresh(source)
        return _source_to_response(source)

    except Exception as e:
        logger.exception("YouTube source import error: {}", str(e))
        raise HTTPException(
            status_code=503,
            detail={"error": "IMPORT_FAILED", "message": "Failed to import YouTube video."},
        )


@router.post("/transcript")
async def load_youtube_transcript(
    req: TranscriptRequest,
    res: Response,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Load and index a YouTube video transcript into a Source record."""
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

        system_prompt = llm_service.build_system_prompt(
            metadata.title,
            metadata.channel_name,
            metadata.duration,
            summary,
        )

        index_started = time.perf_counter()
        chunk_count = await embedding_service.index_transcript_segments(
            video_id, transcript_result.segments, transcript
        )
        index_ms = int((time.perf_counter() - index_started) * 1000)

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
        logger.exception("YouTube transcript fetch error: {}", error_msg)

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
                    "message": "API key is missing, expired, or invalid.",
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
