from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
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
    result = await db.execute(
        select(Video)
        .where(Video.user_id == user.id)
        .order_by(Video.created_at.desc())
    )
    videos = result.scalars().all()
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
            message_count=len(v.messages),
        )
        for v in videos
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

    return SavedVideoResponse(
        id=video.id,
        youtube_video_id=video.youtube_video_id,
        title=video.title,
        channel_name=video.channel_name,
        duration=video.duration,
        thumbnail_url=video.thumbnail_url,
        summary=video.summary,
        created_at=video.created_at.isoformat() if video.created_at else "",
        message_count=0,
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
