import json
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db_models import MentorSession, User
from app.services import llm_service

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You are a knowledgeable AI tutor conducting a one-on-one mentoring session. "
    "Your goal is to assess the user's understanding of a topic, identify gaps, "
    "and guide them toward mastery. Be encouraging but honest in evaluations.\n\n"
    "Always respond in valid JSON with these fields:\n"
    "- evaluation: \"correct\" | \"partial\" | \"incorrect\" | null (null for the first question)\n"
    "- explanation: string — brief, clear explanation of what was right/wrong\n"
    "- follow_up_question: string — the next question to ask (empty string if session should end)\n"
    "- correct_answer: string | null — the correct answer if user was wrong or partial\n"
    "- assessment: string | null — \"mastered\" | \"needs_practice\" | \"struggling\" based on answer quality"
)


START_PROMPT_TEMPLATE = (
    "{system_prompt}\n\n"
    "Topic: {topic}\n"
    "{context_section}"
    "Begin the session by asking the user to explain the core concept of \"{topic}\" in their own words. "
    "Probe for depth rather than surface-level understanding."
)


RESPOND_PROMPT_TEMPLATE = (
    "{system_prompt}\n\n"
    "Ongoing mentor session on: {topic}\n\n"
    "Conversation so far:\n{conversation}\n\n"
    "The user just answered:\n\"{answer}\"\n\n"
    "Evaluate their answer and decide the next step. If they show deep understanding, move to a related subtopic or advance the discussion. "
    "If they are struggling, ask a simpler follow-up or clarify the concept. Always respond in the JSON format specified."
)


END_SESSION_PROMPT_TEMPLATE = (
    "You are an AI tutor reviewing a completed mentoring session.\n\n"
    "Topic: {topic}\n\n"
    "Full conversation:\n{conversation}\n\n"
    "Generate a JSON summary with these fields:\n"
    "- topics_covered: list of strings\n"
    "- correct_count: integer\n"
    "- total_questions: integer\n"
    "- accuracy_percentage: number\n"
    "- strengths: list of strings — what the user understood well\n"
    "- weaknesses: list of strings — areas where user struggled\n"
    "- gaps: list of objects with fields: concept, explanation, suggested_review\n"
    "- overall_assessment: string — 2-3 sentence evaluation\n"
    "- recommended_focus: string — what the user should study next"
)


async def start_session(
    db: AsyncSession,
    workspace_id: str,
    user: User,
    topic: str,
    source_ids: list[str] | None = None,
    context: str = "",
) -> tuple[MentorSession, str]:
    session = MentorSession(
        workspace_id=workspace_id,
        user_id=user.id,
        topic=topic,
        source_ids=json.dumps(source_ids or []),
        messages="[]",
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    context_section = f"Source context: {context[:3000]}\n\n" if context else ""

    prompt = START_PROMPT_TEMPLATE.format(
        system_prompt=SYSTEM_PROMPT,
        topic=topic,
        context_section=context_section,
    )

    raw = await llm_service.generate_text(prompt, temperature=0.4, max_tokens=1024)
    parsed = _parse_json(raw)

    first_question = parsed.get("follow_up_question") or parsed.get("question", "")
    if not first_question:
        first_question = f"Can you explain what you know about {topic}?"

    msg = {
        "role": "ai",
        "content": first_question,
        "evaluation": None,
    }
    messages = [msg]
    session.messages = json.dumps(messages)
    await db.commit()

    return session, first_question


async def respond(
    db: AsyncSession,
    user: User,
    session_id: str,
    answer: str,
) -> dict:
    result = await db.execute(
        select(MentorSession).where(
            MentorSession.id == session_id,
            MentorSession.user_id == user.id,
            MentorSession.status == "active",
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Active mentor session not found")

    messages: list[dict] = json.loads(session.messages or "[]")
    messages.append({"role": "user", "content": answer, "evaluation": None})

    conversation_lines = []
    for m in messages:
        role_label = "AI Tutor" if m["role"] == "ai" else "User"
        conversation_lines.append(f"{role_label}: {m['content']}")
    conversation = "\n".join(conversation_lines)

    prompt = RESPOND_PROMPT_TEMPLATE.format(
        system_prompt=SYSTEM_PROMPT,
        topic=session.topic,
        conversation=conversation,
        answer=answer,
    )

    raw = await llm_service.generate_text(prompt, temperature=0.4, max_tokens=1536)
    parsed = _parse_json(raw)

    evaluation = parsed.get("evaluation")
    follow_up = parsed.get("follow_up_question", "")
    explanation = parsed.get("explanation", "")
    correct_answer = parsed.get("correct_answer")
    assessment = parsed.get("assessment")

    total_questions = sum(1 for m in messages if m["role"] == "ai")
    if evaluation and evaluation == "correct":
        session.correct_count = (session.correct_count or 0) + 1
    session.total_questions = total_questions

    ai_msg = {
        "role": "ai",
        "content": follow_up or explanation,
        "evaluation": evaluation,
        "explanation": explanation,
        "correct_answer": correct_answer,
        "assessment": assessment,
    }
    messages.append(ai_msg)
    session.messages = json.dumps(messages)
    await db.commit()

    return {
        "session_id": session.id,
        "evaluation": evaluation,
        "explanation": explanation,
        "follow_up_question": follow_up,
        "correct_answer": correct_answer,
        "assessment": assessment,
        "total_questions": total_questions,
        "correct_count": session.correct_count,
        "session_complete": not bool(follow_up),
    }


async def end_session(
    db: AsyncSession,
    user: User,
    session_id: str,
) -> dict:
    result = await db.execute(
        select(MentorSession).where(
            MentorSession.id == session_id,
            MentorSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Mentor session not found")

    messages: list[dict] = json.loads(session.messages or "[]")

    conversation_lines = []
    for m in messages:
        role_label = "AI Tutor" if m["role"] == "ai" else "User"
        extra = f" [{m.get('evaluation', '')}]" if m.get("evaluation") else ""
        conversation_lines.append(f"{role_label}: {m['content']}{extra}")
    conversation = "\n".join(conversation_lines)

    prompt = END_SESSION_PROMPT_TEMPLATE.format(
        topic=session.topic,
        conversation=conversation,
    )

    raw = await llm_service.generate_text(prompt, temperature=0.3, max_tokens=2048)
    parsed = _parse_json(raw)

    session.status = "completed"
    session.summary = parsed.get("overall_assessment", "")
    session.gap_report = json.dumps(parsed.get("gaps", []))
    if "correct_count" in parsed:
        session.correct_count = parsed["correct_count"]
    if "total_questions" in parsed:
        session.total_questions = parsed["total_questions"]
    await db.commit()

    return {
        "session_id": session.id,
        "summary": session.summary,
        "gap_report": parsed.get("gaps", []),
        "topics_covered": parsed.get("topics_covered", []),
        "correct_count": session.correct_count,
        "total_questions": session.total_questions,
        "accuracy_percentage": parsed.get("accuracy_percentage", 0),
        "strengths": parsed.get("strengths", []),
        "weaknesses": parsed.get("weaknesses", []),
        "recommended_focus": parsed.get("recommended_focus", ""),
    }


def _parse_json(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.exception("Failed to parse mentor AI response as JSON")
        return {}
