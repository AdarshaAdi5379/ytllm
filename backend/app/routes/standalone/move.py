import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.services.auth_service import get_current_user
from app.db_models import (
    User, StandaloneSession, StandaloneMessage, StandaloneSource,
    Workspace, Source, ChatSession, ChatMessageNew, Folder,
)
from app.models import MoveToWorkspaceRequest
from app.services import embedding_service

router = APIRouter()


def _get_guest_token(request: Request) -> str | None:
    return request.headers.get("X-Guest-Token")


async def _get_session_owner_check(
    db: AsyncSession, session_id: str, user: User | None, guest_token: str | None
) -> StandaloneSession:
    from app.routes.standalone.sessions import _get_session_owner_check as check
    return await check(db, session_id, user, guest_token)


@router.post("/{session_id}/move")
async def move_session_to_workspace(
    session_id: str,
    req: MoveToWorkspaceRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    guest_token = _get_guest_token(request)
    session = await _get_session_owner_check(db, session_id, user, guest_token)

    if not session.user_id:
        raise HTTPException(
            status_code=422,
            detail={"error": "GUEST_SESSION", "message": "Guest sessions cannot be moved. Claim them first by logging in."},
        )

    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == req.workspace_id)
    )
    ws = ws_result.scalar_one_or_none()
    if not ws or (ws.owner_id != user.id):
        from app.services.auth_service import check_workspace_access
        role = await check_workspace_access(db, req.workspace_id, user.id, ("owner", "admin", "editor"))
        if not role:
            raise HTTPException(
                status_code=404,
                detail={"error": "NOT_FOUND", "message": "Workspace not found."},
            )

    if req.folder_id:
        folder_result = await db.execute(
            select(Folder).where(
                Folder.id == req.folder_id,
                Folder.workspace_id == req.workspace_id,
            )
        )
        folder = folder_result.scalar_one_or_none()
        if not folder:
            raise HTTPException(
                status_code=422,
                detail={"error": "FOLDER_NOT_FOUND", "message": "Folder not found in workspace."},
            )

    type_mapping = {
        "text": "text_note",
        "txt": "text_note",
        "md": "markdown_note",
        "website": "website_page",
        "pdf": "pdf_document",
        "docx": "docx_document",
        "pptx": "pptx_document",
    }

    source_result = await db.execute(
        select(StandaloneSource).where(StandaloneSource.session_id == session_id)
    )
    standalone_sources = source_result.scalars().all()

    new_source_ids = []
    for src in standalone_sources:
        mapped_type = type_mapping.get(src.source_type, "text_note")

        new_source = Source(
            workspace_id=req.workspace_id,
            folder_id=req.folder_id,
            user_id=user.id,
            source_type=mapped_type,
            title=src.title,
            metadata_json=json.dumps({
                "original_index_key": src.index_key,
                "original_session_id": session_id,
                "file_name": src.file_name,
            }),
            raw_text=src.content,
            status="ready",
        )
        db.add(new_source)
        await db.flush()
        new_source_ids.append(new_source.id)

    new_session = ChatSession(
        workspace_id=req.workspace_id,
        folder_id=req.folder_id,
        user_id=user.id,
        title=session.title,
        source_ids=json.dumps(new_source_ids),
        model=session.model,
        temperature=session.temperature,
    )
    db.add(new_session)
    await db.flush()

    msg_result = await db.execute(
        select(StandaloneMessage)
        .where(StandaloneMessage.session_id == session_id)
        .order_by(StandaloneMessage.timestamp)
    )
    for msg in msg_result.scalars().all():
        new_msg = ChatMessageNew(
            session_id=new_session.id,
            role=msg.role,
            content=msg.content,
            citations=msg.citations,
            timestamp=msg.timestamp,
        )
        db.add(new_msg)

    for src in standalone_sources:
        embedding_service.delete_chunks(src.index_key)

    await db.delete(session)
    await db.commit()

    return {
        "workspace_id": req.workspace_id,
        "session_id": new_session.id,
    }
