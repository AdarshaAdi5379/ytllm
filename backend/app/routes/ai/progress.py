from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user, verify_workspace_access
from app.db_models import User
from app.models import TopicMasteryResponse, TopicDetailResponse
from app.services import progress_service, mastery_service

router = APIRouter()


@router.get("/dashboard")
async def get_progress_dashboard(
    workspace_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)
    return await progress_service.build_dashboard(db, workspace_id, user.id)


@router.get("/report")
async def get_weekly_report(
    workspace_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)
    text = await progress_service.generate_weekly_report(db, workspace_id, user.id)
    return {"report": text}


@router.get("/topics", response_model=list[TopicMasteryResponse])
async def list_topic_masteries(
    workspace_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all topics in a workspace with their adaptive mastery scores and priorities."""
    await verify_workspace_access(db, workspace_id, user.id)
    return await mastery_service.get_workspace_topic_masteries(db, workspace_id, user.id)


@router.get("/topics/{topic_id}/details", response_model=TopicDetailResponse)
async def get_topic_details(
    topic_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get topic breakdown with related flashcards, quiz questions, and performance timeline."""
    return await mastery_service.get_topic_details(db, topic_id=topic_id, user_id=user.id)

