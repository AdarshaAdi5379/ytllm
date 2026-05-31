from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.services import export_service
from app.utils import session_cache
from app.models import Message
from app.database import get_db
from app.db_models import Video as VideoModel
from app.services.auth_service import get_optional_user
from app.db_models import User


router = APIRouter()


class ExportRequest(BaseModel):
    video_id: str
    format: str  # "pdf" or "docx"
    include_transcript: bool = False
    chat_history: List[Message] = []


@router.post("/")
async def export_chat(
    req: ExportRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate PDF or DOCX export."""
    session_data = session_cache.session_cache.get(req.video_id)

    # Fallback: try to load from database if cache misses
    if not session_data and user is not None:
        result = await db.execute(
            select(VideoModel)
            .where(
                VideoModel.user_id == user.id,
                VideoModel.youtube_video_id == req.video_id,
            )
            .order_by(VideoModel.created_at.desc())
            .limit(1)
            .options(selectinload(VideoModel.messages))
        )
        db_video = result.scalars().first()
        if db_video is not None:
            session_cache.session_cache.set(
                req.video_id,
                {
                    "video_id": req.video_id,
                    "transcript": db_video.transcript or "",
                    "title": db_video.title or "",
                    "channel_name": db_video.channel_name or "",
                    "duration": db_video.duration or "",
                    "thumbnail_url": db_video.thumbnail_url or "",
                    "summary": db_video.summary or "",
                },
            )
            session_data = session_cache.session_cache.get(req.video_id)

    if not session_data:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "SESSION_NOT_FOUND",
                "message": "Video session expired. Please reload the video and try again.",
            },
        )

    try:
        if req.format not in {"pdf", "docx"}:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "INVALID_FORMAT",
                    "message": "Invalid export format. Supported formats are: pdf, docx.",
                },
            )

        export_data = export_service.ExportData(
            video_id=req.video_id,
            title=session_data.title,
            channel_name=session_data.channel_name,
            duration=session_data.duration,
            thumbnail_url=session_data.thumbnail_url,
            summary=session_data.summary,
            chat_history=req.chat_history,
            include_transcript=req.include_transcript,
            transcript=session_data.transcript if req.include_transcript else None,
        )

        if req.format == "pdf":
            content = await export_service.generate_pdf(export_data)
            return Response(
                content=content,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="chat-export-{req.video_id}.pdf"'
                },
            )
        else:
            content = await export_service.generate_docx(export_data)
            return Response(
                content=content,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f'attachment; filename="chat-export-{req.video_id}.docx"'
                },
            )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Export error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "EXPORT_FAILED",
                "message": "Failed to generate export file. Please try again.",
            },
        )
