import json
from datetime import datetime, timedelta
from loguru import logger
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_models import Flashcard, Quiz, Source, LearningPath
from app.services import llm_service


async def build_revision_summary(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
) -> dict:
    """Aggregate all revision data into a structured daily summary."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # --- Due flashcards ---
    due_cards_result = await db.execute(
        select(Flashcard).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user_id,
            (Flashcard.next_review_date == None) | (Flashcard.next_review_date <= now),
        ).order_by(Flashcard.next_review_date.asc().nullsfirst())
    )
    due_cards = due_cards_result.scalars().all()

    # --- Flashcard stats ---
    total_cards_result = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user_id,
        )
    )
    total_cards = total_cards_result.scalar() or 0

    reviewed_today_result = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user_id,
            Flashcard.last_reviewed_at >= today_start,
        )
    )
    reviewed_today = reviewed_today_result.scalar() or 0

    # --- Weak cards (hard difficulty or low success rate) ---
    weak_cards_result = await db.execute(
        select(Flashcard).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user_id,
            Flashcard.total_reviews > 0,
        ).order_by(
            Flashcard.difficulty.desc(),
            (Flashcard.correct_reviews * 1.0 / func.nullif(Flashcard.total_reviews, 1)).asc(),
        ).limit(5)
    )
    weak_cards = weak_cards_result.scalars().all()

    # --- Recently completed quizzes ---
    recent_quizzes_result = await db.execute(
        select(Quiz).where(
            Quiz.workspace_id == workspace_id,
            Quiz.user_id == user_id,
            Quiz.completed_at != None,
        ).order_by(Quiz.completed_at.desc()).limit(10)
    )
    recent_quizzes = recent_quizzes_result.scalars().all()

    # --- Quizzes with low scores (week) ---
    low_score_quizzes = []
    missed_questions = []
    for quiz in recent_quizzes:
        if quiz.completed_at and quiz.completed_at >= week_ago:
            pct = (quiz.score or 0) / max(quiz.max_score or 1, 1) * 100
            if pct < 70:
                low_score_quizzes.append({
                    "id": quiz.id,
                    "title": quiz.title,
                    "quiz_type": quiz.quiz_type,
                    "score": quiz.score,
                    "max_score": quiz.max_score,
                    "percentage": round(pct, 1),
                })
                # Extract questions for missed-question review
                try:
                    questions = json.loads(quiz.questions or "[]")
                    for q in questions:
                        missed_questions.append({
                            "quiz_id": quiz.id,
                            "quiz_title": quiz.title,
                            "question": q.get("question", q.get("scenario", "")),
                            "type": q.get("type", quiz.quiz_type),
                            "options": q.get("options"),
                            "correct_answer": q.get("correct_answer"),
                            "explanation": q.get("explanation", ""),
                        })
                except (json.JSONDecodeError, TypeError):
                    pass

    missed_questions = missed_questions[:10]

    # --- Recent activity (last 7 days) ---
    reviews_7d_result = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user_id,
            Flashcard.last_reviewed_at >= week_ago,
        )
    )
    reviews_7d = reviews_7d_result.scalar() or 0

    quizzes_7d_result = await db.execute(
        select(func.count(Quiz.id)).where(
            Quiz.workspace_id == workspace_id,
            Quiz.user_id == user_id,
            Quiz.completed_at >= week_ago,
        )
    )
    quizzes_7d = quizzes_7d_result.scalar() or 0

    # --- Learning path progress ---
    path_result = await db.execute(
        select(LearningPath).where(
            LearningPath.workspace_id == workspace_id,
            LearningPath.user_id == user_id,
            LearningPath.status == "active",
        ).order_by(LearningPath.created_at.desc()).limit(1)
    )
    active_path = path_result.scalar_one_or_none()
    path_progress = None
    if active_path:
        path_progress = {
            "path_id": active_path.id,
            "title": active_path.title,
            "completed": active_path.completed_topics,
            "total": active_path.total_topics,
            "percentage": round((active_path.completed_topics / max(active_path.total_topics, 1)) * 100, 1),
        }

    # --- Format weak cards ---
    weak_areas = []
    for c in weak_cards:
        rate = (c.correct_reviews / max(c.total_reviews, 1)) * 100
        weak_areas.append({
            "question": c.question,
            "difficulty": c.difficulty,
            "total_reviews": c.total_reviews,
            "correct_rate": round(rate, 1),
        })

    # --- Format due cards ---
    formatted_due = []
    for c in due_cards:
        formatted_due.append({
            "id": c.id,
            "question": c.question,
            "answer": c.answer,
            "difficulty": c.difficulty,
            "total_reviews": c.total_reviews,
            "correct_reviews": c.correct_reviews,
        })

    return {
        "date": now.isoformat(),
        "flashcards": {
            "total": total_cards,
            "due_today": len(due_cards),
            "reviewed_today": reviewed_today,
            "due": formatted_due,
        },
        "weak_areas": weak_areas,
        "missed_questions": missed_questions,
        "low_score_quizzes": low_score_quizzes,
        "activity": {
            "reviews_last_7d": reviews_7d,
            "quizzes_last_7d": quizzes_7d,
            "streak_days": await _compute_streak(db, workspace_id, user_id, today_start),
        },
        "learning_path": path_progress,
    }


async def _compute_streak(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
    today_start: datetime,
) -> int:
    """Compute consecutive days with any review activity."""
    streak = 0
    for days_ago in range(365):
        day = today_start - timedelta(days=days_ago)
        next_day = day + timedelta(days=1)

        fc = await db.execute(
            select(func.count(Flashcard.id)).where(
                Flashcard.workspace_id == workspace_id,
                Flashcard.user_id == user_id,
                Flashcard.last_reviewed_at >= day,
                Flashcard.last_reviewed_at < next_day,
            )
        )
        qz = await db.execute(
            select(func.count(Quiz.id)).where(
                Quiz.workspace_id == workspace_id,
                Quiz.user_id == user_id,
                Quiz.completed_at >= day,
                Quiz.completed_at < next_day,
            )
        )
        if (fc.scalar() or 0) > 0 or (qz.scalar() or 0) > 0:
            streak += 1
        else:
            break
    return streak


async def generate_revision_suggestions(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
) -> str:
    """Generate AI-powered revision suggestions based on user performance."""
    summary = await build_revision_summary(db, workspace_id, user_id)

    if not summary["weak_areas"] and not summary["missed_questions"]:
        return "Great work! You have no weak areas or missed questions. Keep reviewing your flashcards to maintain your streak."

    prompt_parts = ["Based on a student's learning data, suggest 2-3 specific actions for their daily revision."]

    if summary["weak_areas"]:
        prompt_parts.append("Weak flashcard areas:")
        for w in summary["weak_areas"][:3]:
            prompt_parts.append(f"- '{w['question']}' (difficulty: {w['difficulty']}, {w['correct_rate']}% correct)")

    if summary["missed_questions"]:
        prompt_parts.append("Missed quiz questions:")
        for m in summary["missed_questions"][:3]:
            prompt_parts.append(f"- {m['question']} (from quiz: {m['quiz_title']})")

    if summary["low_score_quizzes"]:
        prompt_parts.append("Low-scoring quizzes:")
        for q in summary["low_score_quizzes"]:
            prompt_parts.append(f"- {q['title']}: {q['score']}/{q['max_score']} ({q['percentage']}%)")

    prompt_parts.append("""
Provide 2-3 concise, actionable suggestions. Format as a short paragraph.
Focus on what to review and why. Be encouraging. Do not use markdown.""")

    prompt = "\n".join(prompt_parts)

    try:
        return await llm_service.generate_text(prompt, max_tokens=512)
    except Exception as e:
        logger.exception("Failed to generate revision suggestions: {}", e)
        return "Review your weak flashcards and retry low-scoring quizzes to strengthen your understanding."
