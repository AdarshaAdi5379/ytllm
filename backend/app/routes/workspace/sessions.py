import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.services.auth_service import get_current_user
from app.db_models import User, Workspace, ChatSession, ChatMessageNew, Source
from app.models import (
    ChatSessionResponse, CreateChatSessionRequest, UpdateChatSessionRequest,
    WorkspaceChatMessage,
)

router = APIRouter()


def _session_to_response(s: ChatSession) -> ChatSessionResponse:
    return ChatSessionResponse(
        id=s.id,
        workspace_id=s.workspace_id,
        folder_id=s.folder_id,
        title=s.title,
        source_ids=s.source_ids,
        model=s.model,
        temperature=s.temperature,
        message_count=0,
        created_at=s.created_at.isoformat() if s.created_at else "",
        updated_at=s.updated_at.isoformat() if s.updated_at else "",
    )


async def _verify_ws(db, workspace_id: str, user_id: str) -> Workspace:
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.owner_id == user_id)
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})
    return ws


@router.get("/", response_model=list[ChatSessionResponse])
async def list_sessions(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ws(db, workspace_id, user.id)
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.workspace_id == workspace_id)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    out = []
    for s in sessions:
        count_result = await db.execute(
            select(func.count(ChatMessageNew.id)).where(ChatMessageNew.session_id == s.id)
        )
        resp = _session_to_response(s)
        resp.message_count = int(count_result.scalar() or 0)
        out.append(resp)
    return out


@router.post("/", response_model=ChatSessionResponse, status_code=201)
async def create_session(
    workspace_id: str,
    req: CreateChatSessionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await _verify_ws(db, workspace_id, user.id)
    # Verify source_ids belong to this workspace if provided
    if req.source_ids:
        result = await db.execute(
            select(Source.id).where(
                Source.id.in_(req.source_ids), Source.workspace_id == workspace_id
            )
        )
        existing = {row[0] for row in result.all()}
        missing = set(req.source_ids) - existing
        if missing:
            raise HTTPException(status_code=422, detail={"error": "INVALID_SOURCES", "message": f"Sources not found: {missing}"})

    session = ChatSession(
        workspace_id=workspace_id,
        title=req.title,
        source_ids=json.dumps(req.source_ids),
        user_id=user.id,
        model=req.model,
        temperature=req.temperature,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return _session_to_response(session)


@router.get("/{session_id}", response_model=dict)
async def get_session(
    workspace_id: str,
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ws(db, workspace_id, user.id)
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.workspace_id == workspace_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Session not found."})

    msg_result = await db.execute(
        select(ChatMessageNew)
        .where(ChatMessageNew.session_id == session_id)
        .order_by(ChatMessageNew.timestamp)
    )
    messages = [
        WorkspaceChatMessage(role=m.role, content=m.content, timestamp=m.timestamp)
        for m in msg_result.scalars().all()
    ]
    count_result = await db.execute(
        select(func.count(ChatMessageNew.id)).where(ChatMessageNew.session_id == session_id)
    )
    resp = _session_to_response(s)
    resp.message_count = int(count_result.scalar() or 0)
    return {"session": resp.model_dump(), "messages": [m.model_dump() for m in messages]}


@router.patch("/{session_id}", response_model=ChatSessionResponse)
async def update_session(
    workspace_id: str,
    session_id: str,
    req: UpdateChatSessionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ws(db, workspace_id, user.id)
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.workspace_id == workspace_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Session not found."})
    if req.title is not None:
        s.title = req.title.strip()
    await db.commit()
    await db.refresh(s)
    return _session_to_response(s)


@router.delete("/{session_id}")
async def delete_session(
    workspace_id: str,
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ws(db, workspace_id, user.id)
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.workspace_id == workspace_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Session not found."})
    await db.delete(s)
    await db.commit()
    return {"status": "deleted"}
