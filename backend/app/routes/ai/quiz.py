import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user, verify_workspace_access
from app.db_models import User, Quiz, Source
from app.models import (
    QuizResponse,
    CreateQuizRequest,
    GenerateQuizRequest,
    SubmitQuizRequest,
    SubmitQuizAnswer,
)
from app.services import quiz_service

router = APIRouter()

QUIZ_TYPES = {"mcq", "coding", "short_answer", "long_answer", "case_study", "interview"}


def _quiz_to_response(q: Quiz) -> QuizResponse:
    return QuizResponse(
        id=q.id,
        workspace_id=q.workspace_id,
        source_id=q.source_id,
        title=q.title,
        quiz_type=q.quiz_type,
        questions=q.questions or "[]",
        metadata_json=q.metadata_json or "{}",
        time_limit_minutes=q.time_limit_minutes,
        score=q.score,
        max_score=q.max_score,
        completed_at=q.completed_at.isoformat() if q.completed_at else None,
        created_at=q.created_at.isoformat() if q.created_at else "",
        updated_at=q.updated_at.isoformat() if q.updated_at else "",
    )


@router.get("/", response_model=list[QuizResponse])
async def list_quizzes(
    workspace_id: str = Query(...),
    source_id: str | None = Query(None),
    quiz_type: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)

    query = select(Quiz).where(
        Quiz.workspace_id == workspace_id,
        Quiz.user_id == user.id,
    )
    if source_id:
        query = query.where(Quiz.source_id == source_id)
    if quiz_type:
        query = query.where(Quiz.quiz_type == quiz_type)

    query = query.order_by(Quiz.created_at.desc())
    result = await db.execute(query)
    return [_quiz_to_response(q) for q in result.scalars().all()]


@router.post("/", response_model=QuizResponse, status_code=201)
async def create_quiz(
    req: CreateQuizRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, req.workspace_id, user.id)

    if req.quiz_type not in QUIZ_TYPES:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "INVALID_QUIZ_TYPE",
                "message": f"Quiz type must be one of: {', '.join(sorted(QUIZ_TYPES))}",
            },
        )

    quiz = Quiz(
        workspace_id=req.workspace_id,
        source_id=req.source_id,
        user_id=user.id,
        title=req.title,
        quiz_type=req.quiz_type,
        questions=req.questions,
        time_limit_minutes=req.time_limit_minutes,
        metadata_json="{}",
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return _quiz_to_response(quiz)


@router.post("/generate", response_model=QuizResponse, status_code=201)
async def generate_quiz(
    req: GenerateQuizRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.quiz_type not in QUIZ_TYPES:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "INVALID_QUIZ_TYPE",
                "message": f"Quiz type must be one of: {', '.join(sorted(QUIZ_TYPES))}",
            },
        )

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
        questions = await quiz_service.generate_quiz(
            source.title, source.source_type, raw_text, req.quiz_type, req.count,
        )
    except Exception as e:
        logger.exception("Quiz generation failed: {}", str(e))
        raise HTTPException(
            status_code=503,
            detail={"error": "GENERATION_FAILED", "message": "Failed to generate quiz."},
        )

    max_score = len(questions)
    quiz = Quiz(
        workspace_id=source.workspace_id,
        source_id=source.id,
        user_id=user.id,
        title=f"{req.quiz_type.replace('_', ' ').title()} Quiz - {source.title}",
        quiz_type=req.quiz_type,
        questions=json.dumps(questions),
        time_limit_minutes=req.time_limit_minutes,
        max_score=max_score,
        metadata_json=json.dumps({
            "source_title": source.title,
            "source_type": source.source_type,
        }),
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return _quiz_to_response(quiz)


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == user.id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Quiz not found."},
        )
    return _quiz_to_response(quiz)


@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    req: SubmitQuizRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == user.id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Quiz not found."},
        )
    if quiz.completed_at:
        raise HTTPException(
            status_code=422,
            detail={"error": "ALREADY_COMPLETED", "message": "Quiz has already been submitted."},
        )

    questions = json.loads(quiz.questions or "[]")
    answers = [a.model_dump() for a in req.answers]
    score, max_score = quiz_service.score_quiz(questions, answers)

    quiz.score = score
    quiz.max_score = max_score
    quiz.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(quiz)

    return {
        "quiz_id": quiz.id,
        "score": score,
        "max_score": max_score,
        "percentage": round((score / max_score * 100), 1) if max_score > 0 else 0,
        "completed_at": quiz.completed_at.isoformat() if quiz.completed_at else None,
    }


@router.delete("/{quiz_id}")
async def delete_quiz(
    quiz_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == user.id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "Quiz not found."},
        )
    await db.delete(quiz)
    await db.commit()
    return {"status": "deleted"}
