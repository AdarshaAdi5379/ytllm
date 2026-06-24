import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user, verify_workspace_access
from app.db_models import User, Flashcard, Source
from app.models import (
    FlashcardResponse,
    CreateFlashcardRequest,
    UpdateFlashcardRequest,
    GenerateFlashcardsRequest,
    ReviewFlashcardRequest,
    ReviewQueueItem,
)
from app.services import flashcard_service
from app.services.spaced_repetition import calculate_next_review


router = APIRouter()

DIFFICULTIES = {"easy", "medium", "hard"}


def _fc_to_response(fc: Flashcard) -> FlashcardResponse:
    return FlashcardResponse(
        id=fc.id,
        workspace_id=fc.workspace_id,
        source_id=fc.source_id,
        question=fc.question,
        answer=fc.answer,
        difficulty=fc.difficulty,
        tags=fc.tags or "[]",
        easiness_factor=fc.easiness_factor,
        interval_days=fc.interval_days,
        repetitions=fc.repetitions,
        next_review_date=fc.next_review_date.isoformat() if fc.next_review_date else None,
        last_reviewed_at=fc.last_reviewed_at.isoformat() if fc.last_reviewed_at else None,
        total_reviews=fc.total_reviews,
        correct_reviews=fc.correct_reviews,
        created_at=fc.created_at.isoformat() if fc.created_at else "",
        updated_at=fc.updated_at.isoformat() if fc.updated_at else "",
    )


def _fc_to_review_queue(fc: Flashcard) -> ReviewQueueItem:
    return ReviewQueueItem(
        id=fc.id,
        workspace_id=fc.workspace_id,
        source_id=fc.source_id,
        question=fc.question,
        answer=fc.answer,
        difficulty=fc.difficulty,
        tags=fc.tags or "[]",
        easiness_factor=fc.easiness_factor,
        interval_days=fc.interval_days,
        repetitions=fc.repetitions,
        next_review_date=fc.next_review_date.isoformat() if fc.next_review_date else None,
        last_reviewed_at=fc.last_reviewed_at.isoformat() if fc.last_reviewed_at else None,
        total_reviews=fc.total_reviews,
        correct_reviews=fc.correct_reviews,
    )


@router.get("/", response_model=list[FlashcardResponse])
async def list_flashcards(
    workspace_id: str = Query(...),
    source_id: str | None = Query(None),
    difficulty: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)

    query = select(Flashcard).where(
        Flashcard.workspace_id == workspace_id,
        Flashcard.user_id == user.id,
    )
    if source_id:
        query = query.where(Flashcard.source_id == source_id)
    if difficulty:
        query = query.where(Flashcard.difficulty == difficulty)

    query = query.order_by(Flashcard.created_at.desc())
    result = await db.execute(query)
    return [_fc_to_response(fc) for fc in result.scalars().all()]


@router.post("/", response_model=FlashcardResponse, status_code=201)
async def create_flashcard(
    req: CreateFlashcardRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, req.workspace_id, user.id)

    if req.difficulty not in DIFFICULTIES:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "INVALID_DIFFICULTY",
                "message": f"Difficulty must be one of: {', '.join(sorted(DIFFICULTIES))}",
            },
        )
    if not req.question.strip() or not req.answer.strip():
        raise HTTPException(
            status_code=422,
            detail={"error": "EMPTY_FIELDS", "message": "Question and answer cannot be empty."},
        )

    fc = Flashcard(
        workspace_id=req.workspace_id,
        source_id=req.source_id,
        user_id=user.id,
        question=req.question,
        answer=req.answer,
        difficulty=req.difficulty,
        tags=json.dumps(req.tags),
    )
    db.add(fc)
    await db.commit()
    await db.refresh(fc)
    return _fc_to_response(fc)


@router.get("/review-queue", response_model=list[ReviewQueueItem])
async def review_queue(
    workspace_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)

    now = datetime.utcnow()
    query = select(Flashcard).where(
        Flashcard.workspace_id == workspace_id,
        Flashcard.user_id == user.id,
    ).where(
        (Flashcard.next_review_date == None) | (Flashcard.next_review_date <= now)
    ).order_by(Flashcard.next_review_date.asc().nullsfirst())

    result = await db.execute(query)
    return [_fc_to_review_queue(fc) for fc in result.scalars().all()]


@router.get("/upcoming", response_model=list[ReviewQueueItem])
async def upcoming_reviews(
    workspace_id: str = Query(...),
    days: int = Query(7, description="Number of days to look ahead"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)

    now = datetime.utcnow()
    future = datetime.utcnow()
    try:
        from datetime import timedelta
        future = now + timedelta(days=days)
    except Exception:
        pass

    query = select(Flashcard).where(
        Flashcard.workspace_id == workspace_id,
        Flashcard.user_id == user.id,
    ).where(
        (Flashcard.next_review_date > now) & (Flashcard.next_review_date <= future)
    ).order_by(Flashcard.next_review_date.asc())

    result = await db.execute(query)
    return [_fc_to_review_queue(fc) for fc in result.scalars().all()]


@router.get("/stats")
async def flashcard_stats(
    workspace_id: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)

    now = datetime.utcnow()

    total = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user.id,
        )
    )
    total_count = total.scalar() or 0

    due = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user.id,
            (Flashcard.next_review_date == None) | (Flashcard.next_review_date <= now),
        )
    )
    due_count = due.scalar() or 0

    reviewed_today = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user.id,
            Flashcard.last_reviewed_at >= now.replace(hour=0, minute=0, second=0, microsecond=0),
        )
    )
    reviewed_today_count = reviewed_today.scalar() or 0

    correct_today = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user.id,
            Flashcard.last_reviewed_at >= now.replace(hour=0, minute=0, second=0, microsecond=0),
            Flashcard.repetitions > 0,
        )
    )
    # Approximate: last review today and has any repetition (was answered correctly at least once)
    # More precise tracking would need a separate review log
    correct_today_count = correct_today.scalar() or 0

    return {
        "total": total_count,
        "due_today": due_count,
        "reviewed_today": reviewed_today_count,
        "retention_rate": round((correct_today_count / max(reviewed_today_count, 1)) * 100, 1),
    }


@router.post("/generate", response_model=list[FlashcardResponse], status_code=201)
async def generate_flashcards(
    req: GenerateFlashcardsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    source_result = await db.execute(
        select(Source).where(Source.id == req.source_id, Source.status == "ready")
    )
    source = source_result.scalar_one_or_none()
    if not source:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Source not found or not ready."},
        )

    await verify_workspace_access(db, source.workspace_id, user.id)

    raw_text = source.raw_text or ""
    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail={"error": "NO_CONTENT", "message": "Source has no content."},
        )

    try:
        generated = await flashcard_service.generate_flashcards(
            source.title, source.source_type, raw_text, req.count,
        )
    except Exception as e:
        logger.exception("Flashcard generation failed: {}", str(e))
        raise HTTPException(
            status_code=503,
            detail={"error": "GENERATION_FAILED", "message": "Failed to generate flashcards."},
        )

    created: list[Flashcard] = []
    for fc_data in generated:
        fc = Flashcard(
            workspace_id=source.workspace_id,
            source_id=source.id,
            user_id=user.id,
            question=fc_data.get("question", ""),
            answer=fc_data.get("answer", ""),
            difficulty=fc_data.get("difficulty", "medium"),
            tags=json.dumps([]),
        )
        db.add(fc)
        created.append(fc)

    await db.commit()
    for fc in created:
        await db.refresh(fc)

    return [_fc_to_response(fc) for fc in created]


@router.get("/{flashcard_id}", response_model=FlashcardResponse)
async def get_flashcard(
    flashcard_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == flashcard_id, Flashcard.user_id == user.id)
    )
    fc = result.scalar_one_or_none()
    if not fc:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Flashcard not found."},
        )
    return _fc_to_response(fc)


@router.patch("/{flashcard_id}", response_model=FlashcardResponse)
async def update_flashcard(
    flashcard_id: str,
    req: UpdateFlashcardRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == flashcard_id, Flashcard.user_id == user.id)
    )
    fc = result.scalar_one_or_none()
    if not fc:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Flashcard not found."},
        )

    if req.question is not None:
        if not req.question.strip():
            raise HTTPException(
                status_code=422,
                detail={"error": "EMPTY_FIELD", "message": "Question cannot be empty."},
            )
        fc.question = req.question
    if req.answer is not None:
        if not req.answer.strip():
            raise HTTPException(
                status_code=422,
                detail={"error": "EMPTY_FIELD", "message": "Answer cannot be empty."},
            )
        fc.answer = req.answer
    if req.difficulty is not None:
        if req.difficulty not in DIFFICULTIES:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "INVALID_DIFFICULTY",
                    "message": f"Difficulty must be one of: {', '.join(sorted(DIFFICULTIES))}",
                },
            )
        fc.difficulty = req.difficulty
    if req.tags is not None:
        fc.tags = json.dumps(req.tags)

    await db.commit()
    await db.refresh(fc)
    return _fc_to_response(fc)


@router.delete("/{flashcard_id}")
async def delete_flashcard(
    flashcard_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == flashcard_id, Flashcard.user_id == user.id)
    )
    fc = result.scalar_one_or_none()
    if not fc:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Flashcard not found."},
        )
    await db.delete(fc)
    await db.commit()
    return {"status": "deleted"}


@router.post("/{flashcard_id}/review", response_model=FlashcardResponse)
async def review_flashcard(
    flashcard_id: str,
    req: ReviewFlashcardRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.rating not in (0, 1, 2, 3):
        raise HTTPException(
            status_code=422,
            detail={
                "error": "INVALID_RATING",
                "message": "Rating must be 0 (again), 1 (hard), 2 (good), or 3 (easy).",
            },
        )

    result = await db.execute(
        select(Flashcard).where(Flashcard.id == flashcard_id, Flashcard.user_id == user.id)
    )
    fc = result.scalar_one_or_none()
    if not fc:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Flashcard not found."},
        )

    sm2 = calculate_next_review(
        rating=req.rating,
        easiness_factor=fc.easiness_factor,
        interval_days=fc.interval_days,
        repetitions=fc.repetitions,
    )

    fc.easiness_factor = sm2["easiness_factor"]
    fc.interval_days = sm2["interval_days"]
    fc.repetitions = sm2["repetitions"]
    fc.next_review_date = sm2["next_review_date"]
    fc.last_reviewed_at = datetime.utcnow()
    fc.total_reviews += 1
    if sm2["is_correct"]:
        fc.correct_reviews += 1

    await db.commit()
    await db.refresh(fc)
    return _fc_to_response(fc)
