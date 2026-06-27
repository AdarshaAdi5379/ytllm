import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.services.auth_service import get_current_user, get_optional_user
from app.db_models import User, StandaloneSession, StandaloneMessage, StandaloneSource
from app.models import (
    StandaloneSessionResponse,
    CreateStandaloneSessionRequest,
    UpdateStandaloneSessionRequest,
)
from app.services import embedding_service

router = APIRouter()


def _session_to_response(s: StandaloneSession) -> StandaloneSessionResponse:
    return StandaloneSessionResponse(
        id=s.id,
        title=s.title,
        model=s.model,
        temperature=s.temperature,
        message_count=0,
        source_count=0,
        created_at=s.created_at.isoformat() if s.created_at else "",
        updated_at=s.updated_at.isoformat() if s.updated_at else "",
    )


async def _get_session_owner_check(
    db: AsyncSession,
    session_id: str,
    user: User | None,
    guest_token: str | None,
) -> StandaloneSession:
    result = await db.execute(
        select(StandaloneSession).where(StandaloneSession.id == session_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Session not found."})

    if user and s.user_id == user.id:
        return s
    if guest_token and s.guest_token == guest_token:
        return s
    if s.user_id is not None:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Session not found."})
    if guest_token and s.guest_token == guest_token:
        return s

    raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Session not found."})


def _get_guest_token(request: Request) -> str | None:
    return request.headers.get("X-Guest-Token")


@router.get("", response_model=list[StandaloneSessionResponse])
async def list_sessions(
    request: Request,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    guest_token = _get_guest_token(request)
    query = select(StandaloneSession)

    if user:
        query = query.where(
            (StandaloneSession.user_id == user.id) |
            ((StandaloneSession.user_id.is_(None)) & (StandaloneSession.guest_token == guest_token))
        )
    elif guest_token:
        query = query.where(StandaloneSession.guest_token == guest_token)
    else:
        return []

    query = query.order_by(StandaloneSession.updated_at.desc())
    result = await db.execute(query)
    sessions = result.scalars().all()

    out = []
    for s in sessions:
        resp = _session_to_response(s)
        msg_count = await db.execute(
            select(func.count(StandaloneMessage.id)).where(StandaloneMessage.session_id == s.id)
        )
        resp.message_count = int(msg_count.scalar() or 0)
        src_count = await db.execute(
            select(func.count(StandaloneSource.id)).where(StandaloneSource.session_id == s.id)
        )
        resp.source_count = int(src_count.scalar() or 0)
        out.append(resp)
    return out


@router.post("", response_model=StandaloneSessionResponse, status_code=201)
async def create_session(
    request: Request,
    req: CreateStandaloneSessionRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    guest_token = req.guest_token or _get_guest_token(request)

    session = StandaloneSession(
        user_id=user.id if user else None,
        guest_token=guest_token if not user else None,
        title=req.title or "New Chat",
        model=req.model,
        temperature=req.temperature,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return _session_to_response(session)


@router.get("/{session_id}", response_model=dict)
async def get_session(
    request: Request,
    session_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    guest_token = _get_guest_token(request)
    s = await _get_session_owner_check(db, session_id, user, guest_token)

    msg_result = await db.execute(
        select(StandaloneMessage)
        .where(StandaloneMessage.session_id == session_id)
        .order_by(StandaloneMessage.timestamp)
    )
    messages = [
        {"role": m.role, "content": m.content, "citations": m.citations, "timestamp": m.timestamp}
        for m in msg_result.scalars().all()
    ]

    src_result = await db.execute(
        select(StandaloneSource).where(StandaloneSource.session_id == session_id)
    )
    sources = [
        {
            "id": src.id,
            "session_id": src.session_id,
            "source_type": src.source_type,
            "title": src.title,
            "metadata_json": src.metadata_json,
            "file_name": src.file_name,
            "created_at": src.created_at.isoformat() if src.created_at else "",
        }
        for src in src_result.scalars().all()
    ]

    msg_count = await db.execute(
        select(func.count(StandaloneMessage.id)).where(StandaloneMessage.session_id == session_id)
    )
    src_count = await db.execute(
        select(func.count(StandaloneSource.id)).where(StandaloneSource.session_id == session_id)
    )
    resp = _session_to_response(s)
    resp.message_count = int(msg_count.scalar() or 0)
    resp.source_count = int(src_count.scalar() or 0)

    return {
        "session": resp.model_dump(),
        "messages": messages,
        "sources": sources,
    }


@router.patch("/{session_id}", response_model=StandaloneSessionResponse)
async def update_session(
    request: Request,
    session_id: str,
    req: UpdateStandaloneSessionRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    guest_token = _get_guest_token(request)
    s = await _get_session_owner_check(db, session_id, user, guest_token)
    if req.title is not None:
        s.title = req.title.strip()
    await db.commit()
    await db.refresh(s)
    return _session_to_response(s)


@router.delete("/{session_id}")
async def delete_session(
    request: Request,
    session_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    guest_token = _get_guest_token(request)
    s = await _get_session_owner_check(db, session_id, user, guest_token)

    sources_result = await db.execute(
        select(StandaloneSource).where(StandaloneSource.session_id == session_id)
    )
    for src in sources_result.scalars().all():
        embedding_service.delete_chunks(src.index_key)

    await db.delete(s)
    await db.commit()
    return {"status": "deleted"}
