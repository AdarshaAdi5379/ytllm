import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from loguru import logger

from app.database import get_db
from app.services.auth_service import get_current_user, verify_workspace_access
from app.db_models import User, MentorSession
from app.models import (
    StartMentorSessionRequest,
    MentorRespondRequest,
    MentorSessionResponse,
)
from app.services import mentor_service

router = APIRouter()


def _session_to_response(s: MentorSession) -> MentorSessionResponse:
    return MentorSessionResponse(
        id=s.id,
        workspace_id=s.workspace_id,
        topic=s.topic,
        source_ids=s.source_ids or "[]",
        messages=s.messages or "[]",
        status=s.status,
        summary=s.summary,
        gap_report=s.gap_report,
        correct_count=s.correct_count or 0,
        total_questions=s.total_questions or 0,
        created_at=s.created_at.isoformat() if s.created_at else "",
        updated_at=s.updated_at.isoformat() if s.updated_at else "",
    )


@router.post("/start", status_code=201)
async def start_mentor_session(
    req: StartMentorSessionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, req.workspace_id, user.id)
    try:
        session, first_question = await mentor_service.start_session(
            db, req.workspace_id, user, req.topic, req.source_ids, req.context,
        )
        return {
            "session": _session_to_response(session).model_dump(),
            "first_question": first_question,
        }
    except Exception as e:
        logger.exception("Failed to start mentor session")
        raise HTTPException(status_code=500, detail={"error": "mentor_start_failed", "message": str(e)})


@router.post("/respond")
async def respond_mentor(
    req: MentorRespondRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await mentor_service.respond(db, user, req.session_id, req.answer)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": str(e)})
    except Exception as e:
        logger.exception("Failed to process mentor response")
        raise HTTPException(status_code=500, detail={"error": "mentor_respond_failed", "message": str(e)})


@router.post("/{session_id}/end")
async def end_mentor_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await mentor_service.end_session(db, user, session_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": str(e)})
    except Exception as e:
        logger.exception("Failed to end mentor session")
        raise HTTPException(status_code=500, detail={"error": "mentor_end_failed", "message": str(e)})


@router.get("/sessions")
async def list_mentor_sessions(
    workspace_id: str = Query(...),
    status: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)
    query = select(MentorSession).where(
        MentorSession.workspace_id == workspace_id,
        MentorSession.user_id == user.id,
    )
    if status:
        query = query.where(MentorSession.status == status)
    query = query.order_by(MentorSession.created_at.desc())
    result = await db.execute(query)
    sessions = result.scalars().all()
    return [_session_to_response(s).model_dump() for s in sessions]


@router.get("/{session_id}")
async def get_mentor_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MentorSession).where(
            MentorSession.id == session_id,
            MentorSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Mentor session not found"})
    return _session_to_response(session).model_dump()


@router.delete("/{session_id}")
async def delete_mentor_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MentorSession).where(
            MentorSession.id == session_id,
            MentorSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Mentor session not found"})
    await db.delete(session)
    await db.commit()
    return {"deleted": True}
