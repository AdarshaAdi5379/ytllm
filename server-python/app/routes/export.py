from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List

from app.services import export_service
from app.utils import session_cache
from app.models import Message


router = APIRouter()


class ExportRequest(BaseModel):
    video_id: str
    format: str  # "pdf" or "docx"
    include_transcript: bool = False
    chat_history: List[Message] = []


@router.post("/")
async def export_chat(req: ExportRequest):
    """Generate PDF or DOCX export."""
    session_data = session_cache.session_cache.get(req.video_id)

    if not session_data:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "SESSION_NOT_FOUND",
                "message": "Video session not found. Please reload the video and try again.",
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
