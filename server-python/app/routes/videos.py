from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.db_models import Video, ChatMessage, User
from app.models import SavedVideoResponse, SavedVideoDetail, SaveVideoRequest, Message
from app.services.auth_service import get_current_user


router = APIRouter()


@router.get("/", response_model=list[SavedVideoResponse])
async def list_videos(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List saved videos for the current user.

    IMPORTANT: Do not access v.messages here; async lazy loads cause MissingGreenlet.
    Compute message_count via an aggregate instead.
    """
    result = await db.execute(
        select(Video, func.count(ChatMessage.id))
        .outerjoin(ChatMessage, ChatMessage.video_id == Video.id)
        .where(Video.user_id == user.id)
        .group_by(Video.id)
        .order_by(Video.created_at.desc())
    )
    rows = result.all()
    return [
        SavedVideoResponse(
            id=v.id,
            youtube_video_id=v.youtube_video_id,
            title=v.title,
            channel_name=v.channel_name,
            duration=v.duration,
            thumbnail_url=v.thumbnail_url,
            summary=v.summary,
            created_at=v.created_at.isoformat() if v.created_at else "",
            message_count=int(cnt or 0),
        )
        for (v, cnt) in rows
    ]


@router.get("/{video_id}", response_model=SavedVideoDetail)
async def get_video(
    video_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.user_id == user.id)
        .options(selectinload(Video.messages))
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Video not found."},
        )

    return SavedVideoDetail(
        id=video.id,
        youtube_video_id=video.youtube_video_id,
        title=video.title,
        channel_name=video.channel_name,
        duration=video.duration,
        thumbnail_url=video.thumbnail_url,
        transcript=video.transcript,
        summary=video.summary,
        system_prompt=video.system_prompt,
        messages=[
            Message(role=m.role, content=m.content, timestamp=m.timestamp)
            for m in video.messages
        ],
    )


@router.post("/", response_model=SavedVideoResponse)
async def save_video(
    req: SaveVideoRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Prevent duplicates: transcript route can auto-save, and the client may also call this.
    existing_result = await db.execute(
        select(Video).where(
            Video.user_id == user.id,
            Video.youtube_video_id == req.youtube_video_id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing is None:
        video = Video(
            user_id=user.id,
            youtube_video_id=req.youtube_video_id,
            title=req.title,
            channel_name=req.channel_name,
            duration=req.duration,
            thumbnail_url=req.thumbnail_url,
            transcript=req.transcript,
            summary=req.summary,
            system_prompt=req.system_prompt,
        )
        db.add(video)
        await db.commit()
        await db.refresh(video)
        message_count = 0
    else:
        # Update fields so the latest transcript/prompt are preserved.
        existing.title = req.title
        existing.channel_name = req.channel_name
        existing.duration = req.duration
        existing.thumbnail_url = req.thumbnail_url
        existing.transcript = req.transcript
        existing.summary = req.summary
        existing.system_prompt = req.system_prompt
        await db.commit()
        video = existing
        count_result = await db.execute(
            select(func.count(ChatMessage.id)).where(ChatMessage.video_id == video.id)
        )
        message_count = int(count_result.scalar() or 0)

    return SavedVideoResponse(
        id=video.id,
        youtube_video_id=video.youtube_video_id,
        title=video.title,
        channel_name=video.channel_name,
        duration=video.duration,
        thumbnail_url=video.thumbnail_url,
        summary=video.summary,
        created_at=video.created_at.isoformat() if video.created_at else "",
        message_count=message_count,
    )


@router.delete("/{video_id}")
async def delete_video(
    video_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video).where(Video.id == video_id, Video.user_id == user.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Video not found."},
        )

    await db.delete(video)
    await db.commit()
    return {"status": "deleted"}
