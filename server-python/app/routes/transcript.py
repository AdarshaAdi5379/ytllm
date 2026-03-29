import asyncio
import time
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from app.utils.youtube_parser import extract_video_id
from app.services import transcript_service
from app.services import embedding_service
from app.services import gemini_service
from app.utils import session_cache
from app.config import config


router = APIRouter()


class TranscriptRequest(BaseModel):
    url: str


@router.post("/")
async def load_transcript(req: TranscriptRequest, res: Response):
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
        if config.get("enable_gemini_enrichment"):
            # Generate summary and suggested questions concurrently
            enrich_started = time.perf_counter()
            summary_task = gemini_service.generate_transcript_summary(
                transcript, metadata.title
            )
            questions_task = gemini_service.generate_suggested_questions(
                transcript, metadata.title
            )

            summary, suggested_questions = await asyncio.gather(
                summary_task, questions_task
            )
            enrich_ms = int((time.perf_counter() - enrich_started) * 1000)

        # Build system prompt
        system_prompt = gemini_service.build_system_prompt(
            metadata.title,
            metadata.channel_name,
            metadata.duration,
            summary,
        )

        # Index transcript chunks for semantic search
        index_started = time.perf_counter()
        chunk_count = await embedding_service.index_transcript(video_id, transcript)
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
        print(f"Transcript fetch error: {error_msg}")

        # Handle specific error cases
        if hasattr(e, "code") and e.code == "NO_CAPTIONS":
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "NO_CAPTIONS",
                    "message": "This video has no available captions. Only videos with auto-generated or manual captions are supported.",
                },
            )

        if (
            "generativelanguage.googleapis.com" in error_msg
            or "resourceexhausted" in error_msg.lower()
            or "rate limit" in error_msg.lower()
        ):
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "GEMINI_RATE_LIMIT",
                    "message": "Gemini API quota/rate limit reached. Please wait and try again, or use a higher-quota key/project.",
                },
            )

        if "youtube api quota" in error_msg.lower() or "quota" in error_msg or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "QUOTA_EXCEEDED",
                    "message": "Daily YouTube API quota reached. Please try again tomorrow.",
                },
            )

        if "api key" in error_msg.lower() or "400" in error_msg:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "INVALID_API_KEY",
                    "message": "Google API key is missing, expired, or invalid. Please set a valid GOOGLE_API_KEY in the server-python/.env file.",
                },
            )

        if "404" in error_msg or "is not found" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "MODEL_NOT_FOUND",
                    "message": "Your configured Gemini model is not available for this API key. Set GEMINI_MODEL to an available model (for example: models/gemini-flash-latest).",
                },
            )

        if (
            "403" in error_msg
            or "disabled" in error_msg
            or "SERVICE_DISABLED" in error_msg
        ):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "API_DISABLED",
                    "message": "The Generative Language API is disabled for your Google API key. Please click the link in your Google Cloud Console to enable it.",
                },
            )

        raise HTTPException(
            status_code=503,
            detail={
                "error": "FETCH_FAILED",
                "message": "Failed to fetch video information. Please check the URL and try again.",
            },
        )
