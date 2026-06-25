from datetime import datetime, timedelta, date as date_type
from collections import defaultdict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_models import Flashcard, Quiz, LearningPath, LearningPathTopic
from app.services import llm_service


async def build_dashboard(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
) -> dict:
    """Compute all progress analytics for the dashboard."""
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    days_90 = today - timedelta(days=90)

    # ── Flashcard summary ──
    fc_total = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id, Flashcard.user_id == user_id,
        ),
    )
    fc_total_count = fc_total.scalar() or 0

    fc_reviewed = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id, Flashcard.user_id == user_id,
            Flashcard.total_reviews > 0,
        ),
    )
    fc_reviewed_count = fc_reviewed.scalar() or 0

    fc_correct = await db.execute(
        select(func.coalesce(func.sum(Flashcard.correct_reviews), 0)).where(
            Flashcard.workspace_id == workspace_id, Flashcard.user_id == user_id,
        ),
    )
    fc_correct_sum = fc_correct.scalar() or 0

    fc_total_reviews = await db.execute(
        select(func.coalesce(func.sum(Flashcard.total_reviews), 0)).where(
            Flashcard.workspace_id == workspace_id, Flashcard.user_id == user_id,
        ),
    )
    fc_total_reviews_sum = fc_total_reviews.scalar() or 0

    flashcard_accuracy = round((fc_correct_sum / max(fc_total_reviews_sum, 1)) * 100, 1)

    # ── Quiz summary ──
    qz_result = await db.execute(
        select(
            func.count(Quiz.id),
            func.coalesce(func.sum(Quiz.score), 0),
            func.coalesce(func.sum(Quiz.max_score), 0),
        ).where(
            Quiz.workspace_id == workspace_id,
            Quiz.user_id == user_id,
            Quiz.completed_at != None,
        ),
    )
    qz_row = qz_result.one()
    qz_count = qz_row[0] or 0
    qz_score_sum = qz_row[1] or 0
    qz_max_sum = qz_row[2] or 0
    quiz_accuracy = round((qz_score_sum / max(qz_max_sum, 1)) * 100, 1)

    # ── Learning path progress ──
    lp_result = await db.execute(
        select(
            func.coalesce(func.sum(LearningPath.completed_topics), 0),
            func.coalesce(func.sum(LearningPath.total_topics), 0),
            func.coalesce(func.sum(LearningPath.time_spent_minutes), 0),
        ).where(
            LearningPath.workspace_id == workspace_id,
            LearningPath.user_id == user_id,
        ),
    )
    lp_row = lp_result.one()
    lp_completed = lp_row[0] or 0
    lp_total = lp_row[1] or 0
    lp_minutes = lp_row[2] or 0

    # ── Topic time breakdown ──
    topic_time_result = await db.execute(
        select(LearningPathTopic.title, LearningPathTopic.time_spent_minutes).where(
            LearningPathTopic.learning_path_id.in_(
                select(LearningPath.id).where(
                    LearningPath.workspace_id == workspace_id,
                    LearningPath.user_id == user_id,
                )
            ),
            LearningPathTopic.time_spent_minutes > 0,
        ).order_by(LearningPathTopic.time_spent_minutes.desc())
    )
    per_topic = [{"topic": t, "minutes": m} for t, m in topic_time_result.all()]

    # ── Streak ──
    current_streak, longest_streak = await _compute_streaks(db, workspace_id, user_id, today)

    # ── Daily activity (90 days) ──
    daily_activity = await _compute_daily_activity(db, workspace_id, user_id, days_90, today, now)

    # ── Accuracy trend (weekly buckets, 12 weeks) ──
    accuracy_trend = await _compute_accuracy_trend(db, workspace_id, user_id, today)

    # ── Knowledge score (0-1000) ──
    knowledge_score = _compute_knowledge_score(
        flashcard_accuracy, quiz_accuracy,
        fc_total_count, fc_reviewed_count,
        qz_count, lp_completed, lp_total,
        current_streak, longest_streak,
    )

    # ── Learning hours ──
    total_learning_minutes = lp_minutes + (fc_total_reviews_sum * 2)  # ~2 min per review

    return {
        "learning_hours": {
            "total_minutes": total_learning_minutes,
            "total_hours": round(total_learning_minutes / 60, 1),
            "per_topic": per_topic[:10],
        },
        "completed_topics": {
            "completed": lp_completed,
            "total": lp_total,
            "percentage": round((lp_completed / max(lp_total, 1)) * 100, 1),
        },
        "accuracy": {
            "flashcard": flashcard_accuracy,
            "quiz": quiz_accuracy,
            "overall": round((flashcard_accuracy + quiz_accuracy) / 2, 1),
        },
        "streak": {
            "current": current_streak,
            "longest": longest_streak,
        },
        "knowledge_score": knowledge_score,
        "activity_heatmap": daily_activity,
        "accuracy_trend": accuracy_trend,
        "flashcards": {
            "total": fc_total_count,
            "reviewed": fc_reviewed_count,
            "accuracy": flashcard_accuracy,
        },
        "quizzes": {
            "total": qz_count,
            "accuracy": quiz_accuracy,
        },
    }


async def _compute_streaks(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
    today: datetime,
) -> tuple[int, int]:
    """Compute current and longest streak from review activity."""
    days_set: set[date_type] = set()

    for table, date_col in [(Flashcard, Flashcard.last_reviewed_at), (Quiz, Quiz.completed_at)]:
        result = await db.execute(
            select(func.date(date_col)).where(
                table.workspace_id == workspace_id,
                table.user_id == user_id,
                date_col != None,
            ).distinct()
        )
        for (d,) in result.all():
            if d is None:
                continue
            if isinstance(d, str):
                days_set.add(date_type.fromisoformat(d))
            elif isinstance(d, datetime):
                days_set.add(d.date())
            else:
                days_set.add(d)

    sorted_days = sorted(days_set, reverse=True)
    if not sorted_days:
        return 0, 0

    # Current streak: count backwards from yesterday/today
    current = 0
    check = today.date()
    while check in sorted_days or check == today.date():
        if check in sorted_days:
            current += 1
        check -= timedelta(days=1)
        if check < sorted_days[-1]:
            break

    # Longest streak
    if len(sorted_days) < 2:
        longest = current
    else:
        longest = 1
        run = 1
        for i in range(len(sorted_days) - 1):
            if (sorted_days[i] - sorted_days[i + 1]).days == 1:
                run += 1
                longest = max(longest, run)
            else:
                run = 1

    return current, max(longest, current)


async def _compute_daily_activity(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
    start: datetime,
    today: datetime,
    now: datetime,
) -> list[dict]:
    """Compute daily activity counts for heatmap (90 days)."""
    activity: dict[date_type, int] = defaultdict(int)

    # Flashcard reviews
    fc_result = await db.execute(
        select(func.date(Flashcard.last_reviewed_at), func.count(Flashcard.id)).where(
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user_id,
            Flashcard.last_reviewed_at >= start,
            Flashcard.last_reviewed_at <= now,
        ).group_by(func.date(Flashcard.last_reviewed_at))
    )
    for d, cnt in fc_result.all():
        if d is None:
            continue
        if isinstance(d, str):
            activity[date_type.fromisoformat(d)] += cnt
        elif isinstance(d, datetime):
            activity[d.date()] += cnt
        else:
            activity[d] += cnt

    # Quiz completions
    qz_result = await db.execute(
        select(func.date(Quiz.completed_at), func.count(Quiz.id)).where(
            Quiz.workspace_id == workspace_id,
            Quiz.user_id == user_id,
            Quiz.completed_at >= start,
            Quiz.completed_at <= now,
        ).group_by(func.date(Quiz.completed_at))
    )
    for d, cnt in qz_result.all():
        if d is None:
            continue
        if isinstance(d, str):
            activity[date_type.fromisoformat(d)] += cnt
        elif isinstance(d, datetime):
            activity[d.date()] += cnt
        else:
            activity[d] += cnt

    # Fill all 90 days
    result = []
    for i in range(90):
        d = today - timedelta(days=89 - i)
        result.append({
            "date": d.date().isoformat(),
            "count": activity.get(d.date(), 0),
        })
    return result


async def _compute_accuracy_trend(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
    today: datetime,
) -> list[dict]:
    """Compute weekly accuracy for last 12 weeks."""
    weeks = []

    for w in range(12):
        week_end = today - timedelta(days=today.weekday() + 7 * w)
        week_start = week_end - timedelta(days=6)

        # Flashcard accuracy this week
        fc_where = (
            Flashcard.workspace_id == workspace_id,
            Flashcard.user_id == user_id,
            Flashcard.last_reviewed_at >= week_start,
            Flashcard.last_reviewed_at < week_end + timedelta(days=1),
        )
        fc_correct = await db.execute(
            select(func.coalesce(func.sum(Flashcard.correct_reviews), 0)).where(*fc_where)
        )
        fc_total = await db.execute(
            select(func.coalesce(func.sum(Flashcard.total_reviews), 0)).where(*fc_where)
        )
        c = fc_correct.scalar() or 0
        t = fc_total.scalar() or 0
        fc_acc = round((c / max(t, 1)) * 100, 1) if t > 0 else None

        # Quiz accuracy this week
        qz_where = (
            Quiz.workspace_id == workspace_id,
            Quiz.user_id == user_id,
            Quiz.completed_at >= week_start,
            Quiz.completed_at < week_end + timedelta(days=1),
            Quiz.completed_at != None,
        )
        qz_score = await db.execute(
            select(func.coalesce(func.sum(Quiz.score), 0)).where(*qz_where)
        )
        qz_max = await db.execute(
            select(func.coalesce(func.sum(Quiz.max_score), 0)).where(*qz_where)
        )
        s = qz_score.scalar() or 0
        m = qz_max.scalar() or 0
        qz_acc = round((s / max(m, 1)) * 100, 1) if m > 0 else None

        weeks.append({
            "week": week_start.isoformat(),
            "label": f"{week_start.strftime('%b %d')}",
            "flashcard": fc_acc,
            "quiz": qz_acc,
        })

    return list(reversed(weeks))


def _compute_knowledge_score(
    fc_accuracy: float,
    qz_accuracy: float,
    fc_total: int,
    fc_reviewed: int,
    qz_count: int,
    lp_completed: int,
    lp_total: int,
    current_streak: int,
    longest_streak: int,
) -> int:
    """Compute a composite knowledge score 0-1000."""
    acc_score = ((fc_accuracy + qz_accuracy) / 2) * 4  # 0-400
    volume_score = min((fc_reviewed * 0.5 + qz_count * 10 + lp_completed * 50), 300)  # 0-300
    streak_score = min(current_streak * 15 + longest_streak * 5, 200)  # 0-200
    progress_score = round((lp_completed / max(lp_total, 1)) * 100, 1) if lp_total > 0 else 0  # 0-100

    return min(round(acc_score + volume_score + streak_score + progress_score), 1000)


async def generate_weekly_report(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
) -> str:
    """Generate a weekly progress report using AI."""
    dashboard = await build_dashboard(db, workspace_id, user_id)

    prompt = (
        f"Generate a brief, encouraging weekly learning progress report based on this data:\n"
        f"- Learning hours: {dashboard['learning_hours']['total_hours']}h\n"
        f"- Topics completed: {dashboard['completed_topics']['completed']}/{dashboard['completed_topics']['total']}\n"
        f"- Flashcard accuracy: {dashboard['accuracy']['flashcard']}%\n"
        f"- Quiz accuracy: {dashboard['accuracy']['quiz']}%\n"
        f"- Current streak: {dashboard['streak']['current']} days\n"
        f"- Knowledge score: {dashboard['knowledge_score']}/1000\n\n"
        "Write 3-4 sentences. Highlight what's going well, what needs attention, "
        "and one specific suggestion for next week. Be encouraging. No markdown."
    )
    try:
        return await llm_service.generate_text(prompt, max_tokens=512)
    except Exception:
        return (
            f"You've logged {dashboard['learning_hours']['total_hours']}h of learning, "
            f"completed {dashboard['completed_topics']['completed']} topics, "
            f"and maintained a {dashboard['streak']['current']}-day streak. "
            f"Keep reviewing your weak areas to push your knowledge score higher!"
        )
