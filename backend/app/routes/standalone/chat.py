import json
import time
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, async_session as db_async_session
from app.services.auth_service import get_optional_user
from app.db_models import User, StandaloneSession, StandaloneMessage, StandaloneSource
from app.models import StandaloneChatRequest
from app.services import embedding_service, llm_service, memory_service
from app.config import config

router = APIRouter()


def _get_guest_token(request: Request) -> str | None:
    return request.headers.get("X-Guest-Token")


async def _get_session_owner_check(
    db: AsyncSession, session_id: str, user: User | None, guest_token: str | None
) -> StandaloneSession:
    from app.routes.standalone.sessions import _get_session_owner_check as check
    return await check(db, session_id, user, guest_token)


async def _generate_standalone_stream(
    session_id: str,
    req: StandaloneChatRequest,
    user: User | None,
    guest_token: str | None,
):
    full_response = ""
    user_question = req.question
    sources: list[StandaloneSource] = []

    try:
        async with db_async_session() as db:
            await _get_session_owner_check(db, session_id, user, guest_token)
            src_result = await db.execute(
                select(StandaloneSource).where(StandaloneSource.session_id == session_id)
            )
            sources = src_result.scalars().all()

        if not sources:
            error_json = json.dumps({"type": "error", "message": "No sources in this session. Add a source first."})
            yield f"data: {error_json}\n\n"
            return

        retrieval_started = time.perf_counter()
        all_chunks: list[str] = []
        source_infos: list[dict] = []

        for idx, src in enumerate(sources):
            source_infos.append({
                "id": src.id,
                "title": src.title,
                "source_type": src.source_type,
            })
            try:
                retrieved = await embedding_service.retrieve_relevant_chunks(
                    src.index_key, req.question, top_k=3
                )
            except Exception:
                retrieved = []

            for c in retrieved:
                prefix = f"[{idx + 1} | {src.title}] "
                text = c.get("text", "")
                all_chunks.append(prefix + text)

        retrieval_ms = int((time.perf_counter() - retrieval_started) * 1000)

        chat_history_dicts = [
            {"role": msg.role, "content": msg.content, "timestamp": msg.timestamp}
            for msg in req.chat_history
        ]

        memory_started = time.perf_counter()
        recent_messages, chat_summary = await memory_service.process_history(
            chat_history_dicts, None
        )
        memory_ms = int((time.perf_counter() - memory_started) * 1000)

        source_list_str = "\n".join(
            f"[{idx + 1}] {s['title']} ({s['source_type']})"
            for idx, s in enumerate(source_infos)
        )

        system_prompt = f"""You are an AI assistant helping a user understand their learning materials.

SOURCES:
{source_list_str}

CRITICAL CITATION RULE: When you reference information from a source, you MUST cite the source's number in square brackets, e.g. [1] or [2]. Place the citation at the end of the relevant sentence. Every factual claim must have a citation.

STRICT RULES:
1. Answer factual questions ONLY based on the provided context sections.
2. If the answer to a factual question is not in the context, say clearly: "This information isn't covered in the provided sources."
3. Do NOT use outside knowledge or speculation.
4. Be concise and direct. Use bullet points for lists.
5. Handle casual conversation naturally — greetings, thanks, goodbyes do NOT require citations.
6. If sources disagree, explicitly call out the disagreement and cite each source."""

        context = llm_service.LLMContext(
            system_prompt=system_prompt,
            retrieved_chunks=all_chunks,
            chat_summary=chat_summary,
            recent_messages=recent_messages,
            question=req.question,
        )

        llm_started = time.perf_counter()
        first = True
        citations_list = []
        async for chunk in llm_service.stream_chat_response(
            context,
            model=req.model,
            temperature=req.temperature,
        ):
            if first:
                first = False
                ttfb_ms = int((time.perf_counter() - llm_started) * 1000)
                meta = {
                    "type": "meta",
                    "retrieval_ms": retrieval_ms,
                    "memory_ms": memory_ms,
                    "ttfb_ms": ttfb_ms,
                    "source_count": len(sources),
                }
                yield f"data: {json.dumps(meta)}\n\n"

                citations_meta = []
                for idx, si in enumerate(source_infos):
                    citations_meta.append({
                        "source_id": si["id"],
                        "title": si["title"],
                        "source_type": si["source_type"],
                        "index": idx + 1,
                    })
                yield f"data: {json.dumps({'type': 'citations', 'citations': citations_meta})}\n\n"

            yield chunk
            if chunk.startswith("data: "):
                try:
                    event = json.loads(chunk[6:])
                    if event.get("type") == "token":
                        full_response += event.get("content", "")
                except Exception:
                    pass

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

        async with db_async_session() as save_db:
            now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            save_db.add(StandaloneMessage(
                session_id=session_id,
                role="user",
                content=user_question,
                timestamp=now,
            ))
            save_db.add(StandaloneMessage(
                session_id=session_id,
                role="assistant",
                content=full_response,
                citations=json.dumps(citations_list),
                timestamp=now,
            ))

            sess_result = await save_db.execute(
                select(StandaloneSession).where(StandaloneSession.id == session_id)
            )
            db_session = sess_result.scalar_one_or_none()
            if db_session and db_session.title == "New Chat":
                db_session.title = (user_question.strip()[:80] + "...") if len(user_question.strip()) > 80 else user_question.strip()

            await save_db.commit()

    except Exception as e:
        logger.exception("Standalone chat error: {}", str(e))
        detail = (
            f"{type(e).__name__}: {str(e)}"
            if config.get("node_env") == "development"
            else "Failed to generate response. Please try again."
        )
        yield f"data: {json.dumps({'type': 'error', 'message': detail})}\n\n"


@router.post("/{session_id}/chat")
async def standalone_chat(
    session_id: str,
    req: StandaloneChatRequest,
    request: Request,
    user: User | None = Depends(get_optional_user),
):
    guest_token = _get_guest_token(request)

    return StreamingResponse(
        _generate_standalone_stream(session_id, req, user, guest_token),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
