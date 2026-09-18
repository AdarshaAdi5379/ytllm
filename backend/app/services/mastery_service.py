import json
import re
from datetime import datetime
from typing import Sequence
from loguru import logger
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db_models import Topic, TopicMastery, TopicPerformanceLog, Flashcard, Quiz, MentorSession
from app.models import TopicResponse, TopicMasteryResponse, TopicDetailResponse, FlashcardResponse
from app.services import llm_service


def _now() -> datetime:
    return datetime.utcnow()


# ---------------------------------------------------------------------------
# Pure Mastery Calculation Logic
# ---------------------------------------------------------------------------

def calculate_mastery_metrics(
    total_attempts: int,
    correct_attempts: int,
    consecutive_correct: int,
    consecutive_incorrect: int,
    recent_scores: list[float] | None = None,
) -> tuple[float, str, float, str]:
    """Calculate deterministic topic mastery score (0-100), status, priority, and next action.

    Returns:
        (mastery_score, status, revision_priority, next_recommended_action)
    """
    if total_attempts <= 0:
        return (0.0, "learning", 100.0, "Practice")

    # 1. Base Accuracy
    accuracy = correct_attempts / max(total_attempts, 1)

    # 2. Recency Weighted Accuracy
    if recent_scores:
        weights = [1.0 + (i * 0.15) for i in range(len(recent_scores))]
        weighted_sum = sum(w * s for w, s in zip(weights, recent_scores))
        recency_acc = weighted_sum / sum(weights)
    else:
        recency_acc = accuracy

    # 3. Consistency / Confidence factor based on repetitions
    confidence = min(1.0, total_attempts / 4.0)

    # 4. Raw Score combining long-term accuracy and recent performance
    raw_score = (0.35 * accuracy + 0.65 * recency_acc) * 100.0 * confidence

    # 5. Consecutive streak adjustments
    if consecutive_incorrect >= 2:
        raw_score -= 6.0 * (consecutive_incorrect - 1)
    elif consecutive_correct >= 3:
        raw_score += 3.0 * (consecutive_correct - 2)

    mastery = max(0.0, min(100.0, round(raw_score, 1)))

    # 6. Status Classification
    # Weak: low score or consecutive incorrect failures with multiple attempts
    if mastery < 50.0 or (total_attempts >= 2 and consecutive_incorrect >= 2):
        status = "weak"
    elif mastery < 75.0 or (total_attempts < 3 and mastery >= 50.0):
        status = "learning"
    elif mastery < 90.0:
        status = "strong"
    else:
        status = "mastered" if total_attempts >= 3 else "strong"

    # 7. Revision Priority: higher value = higher revision urgency
    # Weak topics have priority 70-100+, Mastered topics < 10
    priority_mult = 1.0 + (0.25 * consecutive_incorrect)
    revision_priority = max(1.0, round((100.0 - mastery) * priority_mult, 1))

    # 8. Next Recommended Action
    if status == "weak" or mastery < 40.0:
        next_action = "Review now"
    elif mastery < 60.0:
        next_action = "Practice"
    elif mastery < 80.0:
        next_action = "Keep practicing"
    elif mastery < 95.0:
        next_action = "Review Scheduling"
    else:
        next_action = "Mastered"

    return (mastery, status, revision_priority, next_action)


# ---------------------------------------------------------------------------
# Topic Extraction & Sync
# ---------------------------------------------------------------------------

TOPIC_EXTRACTION_PROMPT = """You are a knowledge extraction assistant.
Analyze the following source document and identify the 3 to 7 core topics, concepts, or technical subjects covered.

Source Title: {title}
Source Type: {source_type}

Content:
{content}

Return a JSON array of objects with:
- "name": Concise topic name (e.g. "Deadlocks", "Memory Management", "CPU Scheduling")
- "description": 1-sentence description of what this topic covers in the context of the source

Rules:
- Return ONLY the JSON array, no other text or explanation
- Topic names must be concise (1-4 words), title-cased
- Avoid generic names like "Introduction" or "Overview"

JSON:"""


async def extract_topics_from_text(title: str, source_type: str, content: str) -> list[dict]:
    """Extract key topics from document content using LLM or rule-based fallback."""
    if not content.strip():
        return []

    prompt = TOPIC_EXTRACTION_PROMPT.format(
        title=title,
        source_type=source_type,
        content=content[:6000],
    )

    try:
        response = await llm_service.generate_text(prompt, max_tokens=1024)
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        extracted = json.loads(cleaned)
        if isinstance(extracted, list):
            valid_topics = []
            for item in extracted:
                if isinstance(item, dict) and item.get("name"):
                    name = item["name"].strip()
                    if name and len(name) <= 100:
                        valid_topics.append({
                            "name": name,
                            "description": str(item.get("description", "")).strip(),
                        })
            if valid_topics:
                return valid_topics
    except Exception as e:
        logger.warning("LLM topic extraction failed for '{}': {}", title, e)

    # Fallback heuristic topic extraction from title and headings
    topics = []
    lines = content.splitlines()
    for line in lines[:40]:
        line_clean = line.strip()
        if line_clean.startswith(("#", "##", "###")):
            heading = re.sub(r"^#+\s*", "", line_clean).strip()
            if heading and len(heading) <= 60 and not heading.lower().startswith(("intro", "table of", "summary")):
                topics.append({"name": heading, "description": f"Key concept from {title}"})
        if len(topics) >= 5:
            break

    if not topics and title.strip():
        topics.append({"name": title.strip(), "description": f"Core subject of {title}"})

    return topics


def normalize_topic_key(name: str) -> str:
    """Normalize a topic name for comparison: lowercased, stripped, punctuation stripped, simple singularization."""
    if not name:
        return ""
    text = name.strip().lower()
    text = re.sub(r"[^\w\s]", "", text)
    tokens = text.split()
    normalized_tokens = []
    for token in tokens:
        if token.endswith("ies") and len(token) > 4:
            token = token[:-3] + "y"
        elif token.endswith("es") and len(token) > 3 and token[-3] in "sxhz":
            token = token[:-2]
        elif token.endswith("s") and not token.endswith("ss") and len(token) > 2:
            token = token[:-1]
        normalized_tokens.append(token)
    return " ".join(normalized_tokens)


async def find_matching_topic(
    db: AsyncSession,
    workspace_id: str,
    topic_name: str,
) -> Topic | None:
    """Find an existing topic in workspace by exact, case-insensitive, or stemmed/normalized match."""
    name_clean = topic_name.strip()
    if not name_clean:
        return None

    # 1. Exact case-insensitive DB match first
    stmt = select(Topic).where(
        Topic.workspace_id == workspace_id,
        func.lower(Topic.name) == name_clean.lower(),
    )
    exact = (await db.execute(stmt)).scalar_one_or_none()
    if exact:
        return exact

    # 2. Fetch all workspace topics to perform normalized key matching
    stmt_all = select(Topic).where(Topic.workspace_id == workspace_id)
    all_topics = (await db.execute(stmt_all)).scalars().all()

    target_key = normalize_topic_key(name_clean)
    if not target_key:
        return None

    for t in all_topics:
        if normalize_topic_key(t.name) == target_key:
            return t

    return None


async def sync_topics_for_source(
    db: AsyncSession,
    workspace_id: str,
    source_id: str | None,
    topics_data: list[dict],
) -> list[Topic]:
    """Ensure topic records exist in the database for the given workspace, preventing duplicates."""
    results: list[Topic] = []
    for item in topics_data:
        name = item.get("name", "").strip()
        if not name:
            continue

        desc = item.get("description", "")
        existing = await find_matching_topic(db, workspace_id, name)

        if existing:
            if not existing.description and desc:
                existing.description = desc
            results.append(existing)
        else:
            new_topic = Topic(
                workspace_id=workspace_id,
                source_id=source_id,
                name=name,
                description=desc,
            )
            db.add(new_topic)
            results.append(new_topic)

    await db.commit()
    for t in results:
        await db.refresh(t)
    return results


async def auto_extract_and_sync_source_topics(
    db: AsyncSession,
    workspace_id: str,
    source_id: str,
    title: str,
    source_type: str,
    raw_text: str,
) -> list[Topic]:
    """Automatically extract topics from source content and sync them to the workspace."""
    extracted = await extract_topics_from_text(title, source_type, raw_text)
    if extracted:
        return await sync_topics_for_source(db, workspace_id, source_id, extracted)
    return []


async def get_or_create_topic_by_name(
    db: AsyncSession,
    workspace_id: str,
    topic_name: str,
    source_id: str | None = None,
    description: str = "",
) -> Topic:
    """Find or create a topic by name in a workspace, using normalized matching to prevent duplicates."""
    name_clean = topic_name.strip()
    if not name_clean:
        name_clean = "General"

    topic = await find_matching_topic(db, workspace_id, name_clean)
    if not topic:
        topic = Topic(
            workspace_id=workspace_id,
            source_id=source_id,
            name=name_clean,
            description=description,
        )
        db.add(topic)
        await db.commit()
        await db.refresh(topic)
    elif description and not topic.description:
        topic.description = description
        await db.commit()
        await db.refresh(topic)
    return topic


# ---------------------------------------------------------------------------
# Performance Recording & Mastery Updating
# ---------------------------------------------------------------------------

async def record_topic_performance(
    db: AsyncSession,
    user_id: str,
    workspace_id: str,
    topic_id: str,
    item_type: str,
    item_id: str | None,
    is_correct: bool,
    score: float = 1.0,
) -> TopicMastery:
    """Record an interaction performance and update learner's topic mastery."""
    now = _now()

    # 1. Log performance record
    perf_log = TopicPerformanceLog(
        user_id=user_id,
        workspace_id=workspace_id,
        topic_id=topic_id,
        item_type=item_type,
        item_id=item_id,
        is_correct=1 if is_correct else 0,
        score=score if is_correct else 0.0,
        created_at=now,
    )
    db.add(perf_log)

    # 2. Fetch or create TopicMastery row
    stmt = select(TopicMastery).where(
        TopicMastery.user_id == user_id,
        TopicMastery.topic_id == topic_id,
    )
    mastery = (await db.execute(stmt)).scalar_one_or_none()
    if not mastery:
        mastery = TopicMastery(
            user_id=user_id,
            workspace_id=workspace_id,
            topic_id=topic_id,
            mastery_score=0.0,
            status="learning",
            total_attempts=0,
            correct_attempts=0,
            consecutive_correct=0,
            consecutive_incorrect=0,
            revision_priority=100.0,
            next_recommended_action="Practice",
        )
        db.add(mastery)

    # 3. Update attempt counters
    mastery.total_attempts += 1
    if is_correct:
        mastery.correct_attempts += 1
        if score >= 1.0:
            mastery.consecutive_correct += 1
            mastery.consecutive_incorrect = 0
        else:
            # Partial score (0.0 < score < 1.0): does NOT increment consecutive_correct streak
            mastery.consecutive_correct = 0
            mastery.consecutive_incorrect = 0
    else:
        mastery.consecutive_incorrect += 1
        mastery.consecutive_correct = 0

    mastery.last_practiced_at = now

    # 4. Fetch recent scores for recency calculation (last 10 logs)
    recent_logs_stmt = (
        select(TopicPerformanceLog.score)
        .where(
            TopicPerformanceLog.user_id == user_id,
            TopicPerformanceLog.topic_id == topic_id,
        )
        .order_by(TopicPerformanceLog.created_at.desc())
        .limit(10)
    )
    recent_results = (await db.execute(recent_logs_stmt)).scalars().all()
    # Reverse so oldest in window is first
    recent_scores = list(reversed(recent_results))
    if not recent_scores:
        recent_scores = [1.0 if is_correct else 0.0]

    # 5. Compute new mastery metrics
    new_mastery, new_status, new_priority, new_action = calculate_mastery_metrics(
        total_attempts=mastery.total_attempts,
        correct_attempts=mastery.correct_attempts,
        consecutive_correct=mastery.consecutive_correct,
        consecutive_incorrect=mastery.consecutive_incorrect,
        recent_scores=recent_scores,
    )

    mastery.mastery_score = new_mastery
    mastery.status = new_status
    mastery.revision_priority = new_priority
    mastery.next_recommended_action = new_action

    await db.commit()
    await db.refresh(mastery)
    return mastery


# ---------------------------------------------------------------------------
# Workspace Topic Mastery Queries
# ---------------------------------------------------------------------------

async def get_workspace_topic_masteries(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
) -> list[TopicMasteryResponse]:
    """Retrieve all topics in a workspace with their mastery states."""
    stmt = (
        select(Topic, TopicMastery)
        .outerjoin(
            TopicMastery,
            and_(
                TopicMastery.topic_id == Topic.id,
                TopicMastery.user_id == user_id,
            ),
        )
        .where(Topic.workspace_id == workspace_id)
        .order_by(
            func.coalesce(TopicMastery.revision_priority, 100.0).desc(),
            Topic.name.asc(),
        )
    )

    results = (await db.execute(stmt)).all()
    output: list[TopicMasteryResponse] = []

    for topic, mastery in results:
        total = mastery.total_attempts if mastery else 0
        correct = mastery.correct_attempts if mastery else 0
        accuracy = round((correct / max(total, 1)) * 100.0, 1) if total > 0 else 0.0

        output.append(
            TopicMasteryResponse(
                topic_id=topic.id,
                topic_name=topic.name,
                description=topic.description or "",
                mastery_score=mastery.mastery_score if mastery else 0.0,
                status=mastery.status if mastery else "learning",
                total_attempts=total,
                correct_attempts=correct,
                accuracy_percentage=accuracy,
                revision_priority=mastery.revision_priority if mastery else 100.0,
                last_practiced_at=mastery.last_practiced_at.isoformat() if mastery and mastery.last_practiced_at else None,
                next_recommended_action=mastery.next_recommended_action if mastery else "Practice",
            )
        )

    return output


async def get_weak_focus_areas(
    db: AsyncSession,
    workspace_id: str,
    user_id: str,
    limit: int = 5,
) -> list[TopicMasteryResponse]:
    """Get the learner's highest priority weak topics for immediate review."""
    all_masteries = await get_workspace_topic_masteries(db, workspace_id, user_id)
    # Filter for weak topics or high revision priority
    weak_or_unpracticed = [
        m for m in all_masteries
        if m.status == "weak" or m.mastery_score < 60.0 or m.total_attempts == 0
    ]
    return weak_or_unpracticed[:limit]


async def get_topic_details(
    db: AsyncSession,
    topic_id: str,
    user_id: str,
) -> TopicDetailResponse:
    """Get comprehensive topic breakdown: stats, related flashcards, quizzes, performance logs."""
    topic_stmt = select(Topic).where(Topic.id == topic_id)
    topic = (await db.execute(topic_stmt)).scalar_one_or_none()
    if not topic:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"error": "TOPIC_NOT_FOUND", "message": "Topic not found."})

    # Fetch mastery
    mastery_stmt = select(TopicMastery).where(
        TopicMastery.topic_id == topic_id,
        TopicMastery.user_id == user_id,
    )
    mastery = (await db.execute(mastery_stmt)).scalar_one_or_none()
    total = mastery.total_attempts if mastery else 0
    correct = mastery.correct_attempts if mastery else 0
    accuracy = round((correct / max(total, 1)) * 100.0, 1) if total > 0 else 0.0

    topic_mastery_res = TopicMasteryResponse(
        topic_id=topic.id,
        topic_name=topic.name,
        description=topic.description or "",
        mastery_score=mastery.mastery_score if mastery else 0.0,
        status=mastery.status if mastery else "learning",
        total_attempts=total,
        correct_attempts=correct,
        accuracy_percentage=accuracy,
        revision_priority=mastery.revision_priority if mastery else 100.0,
        last_practiced_at=mastery.last_practiced_at.isoformat() if mastery and mastery.last_practiced_at else None,
        next_recommended_action=mastery.next_recommended_action if mastery else "Practice",
    )

    # Fetch related flashcards
    fc_stmt = (
        select(Flashcard)
        .where(
            Flashcard.workspace_id == topic.workspace_id,
            or_(
                Flashcard.topic_id == topic_id,
                Flashcard.question.ilike(f"%{topic.name}%"),
                Flashcard.tags.ilike(f"%{topic.name}%"),
            ),
        )
        .order_by(Flashcard.created_at.desc())
        .limit(20)
    )
    flashcards = (await db.execute(fc_stmt)).scalars().all()
    fc_responses = [
        FlashcardResponse(
            id=fc.id,
            workspace_id=fc.workspace_id,
            source_id=fc.source_id,
            topic_id=fc.topic_id,
            topic_name=topic.name,
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
        for fc in flashcards
    ]

    # Fetch related quizzes
    quiz_stmt = (
        select(Quiz)
        .where(
            Quiz.workspace_id == topic.workspace_id,
            or_(
                Quiz.questions.ilike(f"%{topic.name}%"),
                Quiz.title.ilike(f"%{topic.name}%"),
            ),
        )
        .order_by(Quiz.created_at.desc())
        .limit(10)
    )
    quizzes = (await db.execute(quiz_stmt)).scalars().all()
    quiz_items = [
        {
            "id": q.id,
            "title": q.title,
            "quiz_type": q.quiz_type,
            "score": q.score,
            "max_score": q.max_score,
            "completed_at": q.completed_at.isoformat() if q.completed_at else None,
        }
        for q in quizzes
    ]

    # Fetch related mentor sessions
    mentor_stmt = (
        select(MentorSession)
        .where(
            MentorSession.workspace_id == topic.workspace_id,
            MentorSession.user_id == user_id,
            or_(
                MentorSession.topic_id == topic_id,
                MentorSession.topic.ilike(f"%{topic.name}%"),
            ),
        )
        .order_by(MentorSession.created_at.desc())
        .limit(10)
    )
    mentor_sessions = (await db.execute(mentor_stmt)).scalars().all()
    mentor_items = [
        {
            "id": m.id,
            "topic": m.topic,
            "status": m.status,
            "correct_count": m.correct_count,
            "total_questions": m.total_questions,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in mentor_sessions
    ]

    # Fetch recent performance history
    perf_stmt = (
        select(TopicPerformanceLog)
        .where(
            TopicPerformanceLog.topic_id == topic_id,
            TopicPerformanceLog.user_id == user_id,
        )
        .order_by(TopicPerformanceLog.created_at.desc())
        .limit(20)
    )
    perf_logs = (await db.execute(perf_stmt)).scalars().all()
    perf_items = [
        {
            "id": p.id,
            "item_type": p.item_type,
            "is_correct": bool(p.is_correct),
            "score": p.score,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        }
        for p in perf_logs
    ]

    return TopicDetailResponse(
        topic=topic_mastery_res,
        related_flashcards=fc_responses,
        related_quizzes=quiz_items,
        related_mentor_sessions=mentor_items,
        recent_performance=perf_items,
    )
