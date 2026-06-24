import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.services.auth_service import get_current_user, verify_workspace_access
from app.db_models import User, LearningPath, LearningPathTopic, Source
from app.models import (
    LearningPathResponse,
    LearningPathTopicResponse,
    GeneratePathRequest,
    UpdatePathTopicRequest,
    UpdatePathRequest,
)
from app.services import learning_path_service

router = APIRouter()


def _topic_to_response(t: LearningPathTopic) -> LearningPathTopicResponse:
    return LearningPathTopicResponse(
        id=t.id,
        learning_path_id=t.learning_path_id,
        title=t.title,
        description=t.description or "",
        sort_order=t.sort_order,
        source_ids=t.source_ids or "[]",
        completed=t.completed,
        completed_at=t.completed_at.isoformat() if t.completed_at else None,
        time_spent_minutes=t.time_spent_minutes or 0,
        created_at=t.created_at.isoformat() if t.created_at else "",
        updated_at=t.updated_at.isoformat() if t.updated_at else "",
    )


def _path_to_response(p: LearningPath) -> LearningPathResponse:
    return LearningPathResponse(
        id=p.id,
        workspace_id=p.workspace_id,
        title=p.title,
        description=p.description or "",
        total_topics=p.total_topics,
        completed_topics=p.completed_topics,
        time_spent_minutes=p.time_spent_minutes or 0,
        status=p.status or "active",
        topics=[_topic_to_response(t) for t in (p.topics or [])],
        created_at=p.created_at.isoformat() if p.created_at else "",
        updated_at=p.updated_at.isoformat() if p.updated_at else "",
    )


@router.get("/", response_model=list[LearningPathResponse])
async def list_paths(
    workspace_id: str = Query(...),
    status: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)

    query = (
        select(LearningPath)
        .options(selectinload(LearningPath.topics))
        .where(
            LearningPath.workspace_id == workspace_id,
            LearningPath.user_id == user.id,
        )
    )
    if status:
        query = query.where(LearningPath.status == status)
    query = query.order_by(LearningPath.created_at.desc())

    result = await db.execute(query)
    return [_path_to_response(p) for p in result.scalars().all()]


@router.post("/generate", response_model=LearningPathResponse, status_code=201)
async def generate_path(
    req: GeneratePathRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, req.workspace_id, user.id)

    sources_result = await db.execute(
        select(Source).where(
            Source.workspace_id == req.workspace_id,
            Source.status == "ready",
        ).order_by(Source.created_at.desc()).limit(50)
    )
    sources = sources_result.scalars().all()

    if not sources:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "NO_SOURCES",
                "message": "No ready sources found in this workspace. Import content first.",
            },
        )

    source_dicts = [
        {"title": s.title, "source_type": s.source_type, "raw_text": s.raw_text or ""}
        for s in sources
    ]

    try:
        result = await learning_path_service.generate_learning_path(
            source_dicts, req.focus_area,
        )
    except Exception as e:
        logger.exception("Learning path generation failed: {}", str(e))
        raise HTTPException(
            status_code=503,
            detail={
                "error": "GENERATION_FAILED",
                "message": "Failed to generate learning path.",
            },
        )

    title = req.title or result.get("title", "Learning Path")
    description = result.get("description", "")
    topics_data = result.get("topics", [])

    path = LearningPath(
        workspace_id=req.workspace_id,
        user_id=user.id,
        title=title,
        description=description,
        total_topics=len(topics_data),
        status="active",
    )
    db.add(path)
    await db.flush()

    created_topics = []
    for td in topics_data:
        topic = LearningPathTopic(
            learning_path_id=path.id,
            title=td.get("title", "Untitled Topic"),
            description=td.get("description", ""),
            sort_order=td.get("sort_order", 0),
            completed=0,
        )
        db.add(topic)
        created_topics.append(topic)

    await db.commit()
    await db.refresh(path)

    # Re-fetch with eager-loaded topics
    result_path = await db.execute(
        select(LearningPath)
        .options(selectinload(LearningPath.topics))
        .where(LearningPath.id == path.id)
    )
    path = result_path.scalar_one()
    return _path_to_response(path)


@router.get("/{path_id}", response_model=LearningPathResponse)
async def get_path(
    path_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningPath)
        .options(selectinload(LearningPath.topics))
        .where(LearningPath.id == path_id, LearningPath.user_id == user.id)
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Learning path not found."},
        )
    return _path_to_response(path)


@router.patch("/{path_id}", response_model=LearningPathResponse)
async def update_path(
    path_id: str,
    req: UpdatePathRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningPath).where(LearningPath.id == path_id, LearningPath.user_id == user.id)
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Learning path not found."},
        )

    if req.title is not None:
        path.title = req.title
    if req.description is not None:
        path.description = req.description
    if req.status is not None:
        if req.status not in ("active", "completed", "archived"):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "INVALID_STATUS",
                    "message": "Status must be one of: active, completed, archived.",
                },
            )
        path.status = req.status

    await db.commit()

    result_path = await db.execute(
        select(LearningPath)
        .options(selectinload(LearningPath.topics))
        .where(LearningPath.id == path.id)
    )
    path = result_path.scalar_one()
    return _path_to_response(path)


@router.delete("/{path_id}")
async def delete_path(
    path_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningPath).where(LearningPath.id == path_id, LearningPath.user_id == user.id)
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Learning path not found."},
        )
    await db.delete(path)
    await db.commit()
    return {"status": "deleted"}


@router.patch("/{path_id}/topics/{topic_id}", response_model=LearningPathTopicResponse)
async def update_topic(
    path_id: str,
    topic_id: str,
    req: UpdatePathTopicRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    path_result = await db.execute(
        select(LearningPath).where(LearningPath.id == path_id, LearningPath.user_id == user.id)
    )
    path = path_result.scalar_one_or_none()
    if not path:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Learning path not found."},
        )

    result = await db.execute(
        select(LearningPathTopic).where(
            LearningPathTopic.id == topic_id,
            LearningPathTopic.learning_path_id == path_id,
        )
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Topic not found."},
        )

    was_completed = topic.completed

    if req.completed is not None:
        topic.completed = req.completed
        if req.completed and not was_completed:
            topic.completed_at = datetime.utcnow()
        elif not req.completed:
            topic.completed_at = None

    if req.time_spent_minutes is not None:
        topic.time_spent_minutes = (topic.time_spent_minutes or 0) + req.time_spent_minutes
        path.time_spent_minutes = (path.time_spent_minutes or 0) + req.time_spent_minutes

    await db.commit()

    # Recalculate completed_topics
    topics_result = await db.execute(
        select(func.count(LearningPathTopic.id)).where(
            LearningPathTopic.learning_path_id == path_id,
            LearningPathTopic.completed == 1,
        )
    )
    completed_count = topics_result.scalar() or 0
    path.completed_topics = completed_count
    if completed_count >= path.total_topics and path.total_topics > 0:
        path.status = "completed"

    await db.commit()
    await db.refresh(topic)
    return _topic_to_response(topic)
