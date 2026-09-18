import json
import re
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from app.db_models import MentorSession, User, Source, SourceChunk, Topic
from app.services import llm_service, mastery_service, embedding_service

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You are a rigorous, knowledgeable AI tutor conducting an interactive one-on-one mentoring session. "
    "Your goal is to assess the user's understanding of a topic based strictly on their study material, identify knowledge gaps, "
    "and guide them toward mastery. Be encouraging, precise, and honest in evaluations.\n\n"
    "Rules:\n"
    "1. Base your questions, explanations, and evaluations strictly on the provided Study Material.\n"
    "2. If the study material is empty or does not contain sufficient information about the topic, explicitly tell the user: "
    "\"The study material in this workspace does not contain sufficient information on this topic to conduct a grounded mentoring session. Please add or select relevant study sources.\"\n"
    "3. Always respond in valid JSON with these fields:\n"
    "- evaluation: \"correct\" | \"partial\" | \"incorrect\" | null (null for the first question)\n"
    "- explanation: string — brief, clear explanation citing why the answer was right/partial/wrong based on study material\n"
    "- follow_up_question: string — the next question to ask (empty string if session should end)\n"
    "- correct_answer: string | null — the correct answer based on study material if user was wrong or partial\n"
    "- assessment: string | null — \"mastered\" | \"needs_practice\" | \"struggling\" based on answer quality"
)


START_PROMPT_TEMPLATE = (
    "{system_prompt}\n\n"
    "Topic: {topic}\n\n"
    "Study Material:\n{source_context}\n\n"
    "Begin the session by asking the user a focused question testing their understanding of the core concepts of \"{topic}\" covered in the study material. "
    "Probe for depth rather than surface-level understanding."
)


RESPOND_PROMPT_TEMPLATE = (
    "{system_prompt}\n\n"
    "Ongoing mentor session on: {topic}\n\n"
    "Study Material:\n{source_context}\n\n"
    "Conversation so far:\n{conversation}\n\n"
    "The user just answered:\n\"{answer}\"\n\n"
    "Evaluate their answer strictly against the Study Material and decide the next step. "
    "If their answer is accurate and complete according to the material, mark evaluation as \"correct\". "
    "If they captured key concepts but missed important nuances or details from the study material, mark evaluation as \"partial\". "
    "If their answer is factually incorrect or unsupported by the material, mark evaluation as \"incorrect\". "
    "Provide a constructive explanation and ask the next follow-up question. "
    "Always respond in the JSON format specified."
)


END_SESSION_PROMPT_TEMPLATE = (
    "You are an AI tutor reviewing a completed mentoring session based on the learner's study material.\n\n"
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


async def retrieve_grounding_context(
    db: AsyncSession,
    workspace_id: str,
    topic: str,
    source_ids: list[str] | None = None,
    max_chunks: int = 6,
) -> tuple[str, list[dict]]:
    """Retrieve relevant study chunks from workspace sources using ChromaDB with database fallback.

    Returns:
        (formatted_context_string, list_of_chunks)
    """
    # 1. Fetch relevant Source records
    source_stmt = select(Source).where(Source.workspace_id == workspace_id)
    if source_ids:
        source_stmt = source_stmt.where(Source.id.in_(source_ids))
    source_stmt = source_stmt.where(Source.status != "error").order_by(Source.created_at.desc())

    result = await db.execute(source_stmt)
    sources = result.scalars().all()

    if not sources:
        return "", []

    collection_keys: list[str] = []
    source_lookup: dict[str, str] = {}

    for src in sources:
        meta = {}
        try:
            meta = json.loads(src.metadata_json or "{}")
        except Exception:
            meta = {}
        key = meta.get("video_id") or meta.get("index_key") or src.id
        if key:
            collection_keys.append(key)
            source_lookup[key] = src.title or "Untitled Source"

    retrieved_chunks: list[dict] = []

    # 2. Try ChromaDB vector search across collections
    if collection_keys:
        try:
            raw_results = await embedding_service.search_across_collections(
                collection_keys, query=topic, top_k_per_source=3, max_results=max_chunks
            )
            for r in raw_results:
                key = r.get("collection_key", "")
                title = source_lookup.get(key, "Study Source")
                retrieved_chunks.append({
                    "title": title,
                    "text": r.get("text", ""),
                })
        except Exception as e:
            logger.warning("Vector retrieval failed in mentor session for topic '{}': {}", topic, e)

    # 3. Fallback: Search DB chunks or raw_text if vector search returned nothing
    if not retrieved_chunks:
        # Check source chunks matching topic keywords
        keywords = [k.strip() for k in topic.split() if len(k.strip()) > 3]
        if keywords:
            chunk_conditions = [SourceChunk.text.ilike(f"%{kw}%") for kw in keywords]
            chunk_stmt = (
                select(SourceChunk, Source.title)
                .join(Source, Source.id == SourceChunk.source_id)
                .where(
                    Source.workspace_id == workspace_id,
                    or_(*chunk_conditions)
                )
                .limit(max_chunks)
            )
            chunk_res = await db.execute(chunk_stmt)
            for ch, title in chunk_res.all():
                retrieved_chunks.append({
                    "title": title or "Study Source",
                    "text": ch.text,
                })

        # Fallback to source raw_text if still empty
        if not retrieved_chunks:
            for src in sources[:3]:
                if src.raw_text and len(src.raw_text.strip()) > 50:
                    retrieved_chunks.append({
                        "title": src.title or "Study Source",
                        "text": src.raw_text[:2000],
                    })

    if not retrieved_chunks:
        return "", []

    # 4. Format into prompt-friendly context
    formatted_lines = []
    for idx, c in enumerate(retrieved_chunks, 1):
        formatted_lines.append(f"[Source {idx}: {c['title']}]\n{c['text']}")

    context_str = "\n\n".join(formatted_lines)
    return context_str, retrieved_chunks


def _parse_json(raw: str) -> dict:
    """Safely parse LLM JSON responses with markdown stripping and regex fallback."""
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
        # Try extracting JSON object via regex
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        logger.warning("Failed to parse mentor AI response as JSON: {}", raw[:200])
        return {}


async def start_session(
    db: AsyncSession,
    workspace_id: str,
    user: User,
    topic: str,
    topic_id: str | None = None,
    source_ids: list[str] | None = None,
    context: str = "",
) -> tuple[MentorSession, str]:
    """Start a source-grounded mentor session connected to the Adaptive Mastery Engine."""
    # 1. Resolve or create Topic in database
    if topic_id:
        topic_stmt = select(Topic).where(Topic.id == topic_id, Topic.workspace_id == workspace_id)
        topic_obj = (await db.execute(topic_stmt)).scalar_one_or_none()
        if not topic_obj:
            topic_obj = await mastery_service.get_or_create_topic_by_name(
                db, workspace_id, topic, source_id=source_ids[0] if source_ids else None
            )
    else:
        topic_obj = await mastery_service.get_or_create_topic_by_name(
            db, workspace_id, topic, source_id=source_ids[0] if source_ids else None
        )

    # 2. Retrieve grounded study context
    grounded_context, _ = await retrieve_grounding_context(
        db, workspace_id, topic_obj.name, source_ids=source_ids, max_chunks=6
    )
    if not grounded_context and context.strip():
        grounded_context = context[:3000]

    # 3. Create MentorSession
    session = MentorSession(
        workspace_id=workspace_id,
        user_id=user.id,
        topic_id=topic_obj.id,
        topic=topic_obj.name,
        source_ids=json.dumps(source_ids or []),
        messages="[]",
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # 4. Prompt LLM for initial grounded question
    if not grounded_context.strip():
        source_context_text = "(No study material available in this workspace for this topic)"
    else:
        source_context_text = grounded_context

    prompt = START_PROMPT_TEMPLATE.format(
        system_prompt=SYSTEM_PROMPT,
        topic=topic_obj.name,
        source_context=source_context_text,
    )

    raw = await llm_service.generate_text(prompt, temperature=0.4, max_tokens=1024)
    parsed = _parse_json(raw)

    first_question = parsed.get("follow_up_question") or parsed.get("question", "")
    if not first_question:
        if not grounded_context.strip():
            first_question = (
                f"The study material in this workspace does not contain sufficient information on \"{topic_obj.name}\" "
                "to conduct a grounded mentoring session. Please add or select relevant study sources."
            )
        else:
            first_question = f"Based on your study material for {topic_obj.name}, can you explain the core concepts and principles?"

    msg = {
        "role": "ai",
        "content": first_question,
        "evaluation": None,
    }
    session.messages = json.dumps([msg])
    await db.commit()

    return session, first_question


async def respond(
    db: AsyncSession,
    user: User,
    session_id: str,
    answer: str,
) -> dict:
    """Evaluate user answer against study material and update Adaptive Mastery Engine."""
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

    # Retrieve source context for grounding
    source_ids = []
    try:
        source_ids = json.loads(session.source_ids or "[]")
    except Exception:
        pass

    grounded_context, _ = await retrieve_grounding_context(
        db, session.workspace_id, session.topic, source_ids=source_ids, max_chunks=6
    )
    source_context_text = grounded_context if grounded_context.strip() else "(No study material provided)"

    prompt = RESPOND_PROMPT_TEMPLATE.format(
        system_prompt=SYSTEM_PROMPT,
        topic=session.topic,
        source_context=source_context_text,
        conversation=conversation,
        answer=answer,
    )

    raw = await llm_service.generate_text(prompt, temperature=0.4, max_tokens=1536)
    parsed = _parse_json(raw)

    # Safe fallback if LLM response was malformed JSON
    if not parsed:
        evaluation = "partial"
        explanation = "Thank you for your answer. Let's continue exploring this topic."
        follow_up = "Could you elaborate further on how this applies to the core concept in your study material?"
        correct_answer = None
        assessment = "needs_practice"
        session_complete = False
    else:
        evaluation = parsed.get("evaluation")
        follow_up = parsed.get("follow_up_question", "")
        explanation = parsed.get("explanation", "")
        correct_answer = parsed.get("correct_answer")
        assessment = parsed.get("assessment")
        session_complete = (follow_up == "")

    total_questions = sum(1 for m in messages if m["role"] == "ai")
    if evaluation == "correct":
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

    # Adaptive Mastery Engine Integration
    if session.topic_id and evaluation in ("correct", "partial", "incorrect"):
        is_correct = (evaluation in ("correct", "partial"))
        score = 1.0 if evaluation == "correct" else (0.5 if evaluation == "partial" else 0.0)
        try:
            await mastery_service.record_topic_performance(
                db=db,
                user_id=user.id,
                workspace_id=session.workspace_id,
                topic_id=session.topic_id,
                item_type="mentor",
                item_id=session.id,
                is_correct=is_correct,
                score=score,
            )
        except Exception as e:
            logger.warning("Failed to record topic mastery for mentor session: {}", e)

    return {
        "session_id": session.id,
        "topic_id": session.topic_id,
        "evaluation": evaluation,
        "explanation": explanation,
        "follow_up_question": follow_up,
        "correct_answer": correct_answer,
        "assessment": assessment,
        "total_questions": total_questions,
        "correct_count": session.correct_count,
        "session_complete": session_complete,
    }


async def end_session(
    db: AsyncSession,
    user: User,
    session_id: str,
) -> dict:
    """End a mentor session and generate structured gap summary."""
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
        "topic_id": session.topic_id,
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
