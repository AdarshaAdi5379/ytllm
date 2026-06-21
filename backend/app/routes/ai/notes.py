import json
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user
from app.db_models import User, Note, Workspace
from app.models import NoteResponse, CreateNoteRequest, UpdateNoteRequest


router = APIRouter()


DIFFICULTIES = {"beginner", "intermediate", "advanced"}


def _note_to_response(n: Note) -> NoteResponse:
    return NoteResponse(
        id=n.id,
        workspace_id=n.workspace_id,
        source_id=n.source_id,
        content=n.content,
        tags=n.tags or "[]",
        topic=n.topic or "",
        difficulty=n.difficulty or "intermediate",
        importance=n.importance or 3,
        created_at=n.created_at.isoformat() if n.created_at else "",
        updated_at=n.updated_at.isoformat() if n.updated_at else "",
    )


async def _verify_ws(db: AsyncSession, workspace_id: str, user_id: str) -> Workspace:
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id, Workspace.owner_id == user_id
        )
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Workspace not found."},
        )
    return ws


@router.get("/", response_model=list[NoteResponse])
async def list_notes(
    workspace_id: str = Query(...),
    source_id: str | None = Query(None),
    topic: str | None = Query(None),
    difficulty: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ws(db, workspace_id, user.id)

    query = select(Note).where(
        Note.workspace_id == workspace_id, Note.user_id == user.id
    )
    if source_id:
        query = query.where(Note.source_id == source_id)
    if topic:
        query = query.where(Note.topic == topic)
    if difficulty:
        query = query.where(Note.difficulty == difficulty)

    query = query.order_by(Note.updated_at.desc())
    result = await db.execute(query)
    notes = result.scalars().all()
    return [_note_to_response(n) for n in notes]


@router.post("/", response_model=NoteResponse, status_code=201)
async def create_note(
    req: CreateNoteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_ws(db, req.workspace_id, user.id)

    if req.difficulty not in DIFFICULTIES:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "INVALID_DIFFICULTY",
                "message": f"Difficulty must be one of: {', '.join(sorted(DIFFICULTIES))}",
            },
        )
    if req.importance < 1 or req.importance > 5:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "INVALID_IMPORTANCE",
                "message": "Importance must be between 1 and 5.",
            },
        )

    note = Note(
        workspace_id=req.workspace_id,
        source_id=req.source_id,
        user_id=user.id,
        content=req.content,
        tags=json.dumps(req.tags),
        topic=req.topic,
        difficulty=req.difficulty,
        importance=req.importance,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return _note_to_response(note)


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Note not found."},
        )
    return _note_to_response(note)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    req: UpdateNoteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Note not found."},
        )

    if req.content is not None:
        note.content = req.content
    if req.tags is not None:
        note.tags = json.dumps(req.tags)
    if req.topic is not None:
        note.topic = req.topic
    if req.difficulty is not None:
        if req.difficulty not in DIFFICULTIES:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "INVALID_DIFFICULTY",
                    "message": f"Difficulty must be one of: {', '.join(sorted(DIFFICULTIES))}",
                },
            )
        note.difficulty = req.difficulty
    if req.importance is not None:
        if req.importance < 1 or req.importance > 5:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "INVALID_IMPORTANCE",
                    "message": "Importance must be between 1 and 5.",
                },
            )
        note.importance = req.importance

    await db.commit()
    await db.refresh(note)
    return _note_to_response(note)


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Note not found."},
        )
    await db.delete(note)
    await db.commit()
    return {"status": "deleted"}
