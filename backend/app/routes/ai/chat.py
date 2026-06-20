import json
import time
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import async_session as db_async_session
from app.database import get_db
from app.db_models import Video as VideoModel, ChatMessage, Source, ChatSession, ChatMessageNew, Workspace, Folder
from app.services.auth_service import get_optional_user, get_current_user
from app.db_models import User
from app.services import embedding_service
from app.services import memory_service
from app.services import llm_service
from app.models import Message, WorkspaceChatRequest, WorkspaceChatMessage
from app.utils import session_cache
from app.config import config


router = APIRouter()


class ChatFilters(BaseModel):
    time_range_s: Optional[List[float]] = None
    chunk_index_range: Optional[List[int]] = None


class ChatRequest(BaseModel):
    video_id: str
    question: str
    chat_history: List[Message] = []
    system_prompt: str = ""
    debug: bool = False
    filters: Optional[ChatFilters] = None


class VideoMetadataFilter(BaseModel):
    title_contains: Optional[str] = None
    channel_contains: Optional[str] = None
    min_duration_s: Optional[int] = None
    max_duration_s: Optional[int] = None


class MultiChatRequest(BaseModel):
    video_ids: List[str]
    question: str
    chat_history: List[Message] = []
    system_prompt: str = ""
    debug: bool = False
    filters: Optional[ChatFilters] = None
    video_metadata_filter: Optional[VideoMetadataFilter] = None


async def generate_stream(req: ChatRequest, current_user: User | None = None):
    user_question = req.question
    full_response = ""
    try:
        retrieval_started = time.perf_counter()
        retrieved = await embedding_service.retrieve_relevant_chunks(
            req.video_id,
            req.question,
            filters=req.filters.model_dump() if req.filters else None,
        )
        retrieval_ms = int((time.perf_counter() - retrieval_started) * 1000)

        retrieved_chunks = [_format_retrieved_chunk(c) for c in retrieved]

        chat_history_dicts = [
            {"role": msg.role, "content": msg.content, "timestamp": msg.timestamp}
            for msg in req.chat_history
        ]

        memory_started = time.perf_counter()
        recent_messages, chat_summary = await memory_service.process_history(
            chat_history_dicts, None
        )
        memory_ms = int((time.perf_counter() - memory_started) * 1000)

        context = llm_service.LLMContext(
            system_prompt=req.system_prompt,
            retrieved_chunks=retrieved_chunks,
            chat_summary=chat_summary,
            recent_messages=recent_messages,
            question=req.question,
        )

        llm_started = time.perf_counter()
        first = True
        async for chunk in llm_service.stream_chat_response(context):
            if first:
                first = False
                ttfb_ms = int((time.perf_counter() - llm_started) * 1000)
                meta: dict = {
                    "type": "meta",
                    "retrieval_ms": retrieval_ms,
                    "memory_ms": memory_ms,
                    "ttfb_ms": ttfb_ms,
                }
                if req.debug and config.get("node_env") != "production":
                    meta["retrieved_chunks"] = retrieved_chunks
                    meta["retrieved_chunks_count"] = len(retrieved_chunks)
                meta_json = json.dumps(meta)
                yield f"data: {meta_json}\n\n"
            yield chunk
            if chunk.startswith("data: "):
                try:
                    event = json.loads(chunk[6:])
                    if event.get("type") == "token":
                        full_response += event.get("content", "")
                except Exception:
                    pass

        if current_user is not None:
            try:
                async with db_async_session() as save_db:
                    result = await save_db.execute(
                        select(VideoModel)
                        .where(
                            VideoModel.user_id == current_user.id,
                            VideoModel.youtube_video_id == req.video_id,
                        )
                        .order_by(VideoModel.created_at.desc())
                    )
                    db_video = result.scalars().first()
                    if db_video is not None:
                        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                        save_db.add(ChatMessage(video_id=db_video.id, role="user", content=user_question, timestamp=now))
                        save_db.add(ChatMessage(video_id=db_video.id, role="assistant", content=full_response, timestamp=now))
                        await save_db.commit()
            except Exception as save_err:
                logger.warning("Failed to save chat messages: {}", save_err)

    except Exception as e:
        logger.exception("Chat error: {}", str(e))
        detail = (
            f"{type(e).__name__}: {str(e)}"
            if config.get("node_env") == "development"
            else "Failed to generate response. Please try again."
        )
        error_json = json.dumps({"type": "error", "message": detail})
        yield f"data: {error_json}\n\n"


@router.post("/single")
async def chat_single(req: ChatRequest, user: User | None = Depends(get_optional_user)):
    """Stream a chat response against a single source (SSE)."""
    return StreamingResponse(
        generate_stream(req, current_user=user),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/multi")
async def chat_multi(req: MultiChatRequest):
    """Stream a chat response across multiple sources (SSE)."""
    if not req.video_ids:
        raise HTTPException(
            status_code=422,
            detail={"error": "NO_VIDEOS", "message": "Provide at least one video_id."},
        )

    max_videos = int(config.get("max_multi_videos", 10))
    if len(req.video_ids) > max_videos:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "TOO_MANY_VIDEOS",
                "message": f"Maximum {max_videos} videos per multi query.",
            },
        )

    return StreamingResponse(
        generate_multi_stream(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def generate_multi_stream(req: MultiChatRequest, current_user: User | None = None):
    try:
        selected_ids = list(dict.fromkeys(req.video_ids))

        if req.video_metadata_filter:
            f = req.video_metadata_filter
            filtered: list[str] = []
            for vid in selected_ids:
                session = session_cache.session_cache.get(vid)
                if not session:
                    continue
                if f.title_contains and f.title_contains.lower() not in (session.title or "").lower():
                    continue
                if f.channel_contains and f.channel_contains.lower() not in (session.channel_name or "").lower():
                    continue
                dur_s = _parse_duration_to_seconds(session.duration)
                if f.min_duration_s is not None and dur_s < f.min_duration_s:
                    continue
                if f.max_duration_s is not None and dur_s > f.max_duration_s:
                    continue
                filtered.append(vid)
            selected_ids = filtered

        if not selected_ids:
            error_json = json.dumps({"type": "error", "message": "No loaded videos matched the provided metadata filters."})
            yield f"data: {error_json}\n\n"
            return

        retrieval_started = time.perf_counter()
        per_video_chunks: list[str] = []
        video_infos: list[dict] = []
        total_retrieved = 0

        for vid in selected_ids:
            session = session_cache.session_cache.get(vid)
            title = session.title if session else vid
            channel = session.channel_name if session else ""
            duration = session.duration if session else ""
            video_infos.append({"video_id": vid, "title": title, "channel_name": channel, "duration": duration})

            retrieved = await embedding_service.retrieve_relevant_chunks(
                vid, req.question, filters=req.filters.model_dump() if req.filters else None,
            )
            total_retrieved += len(retrieved)
            for idx, c in enumerate(retrieved):
                prefix = f"[Video: {title} ({vid}) | Section {idx + 1}] "
                per_video_chunks.append(prefix + _format_retrieved_chunk(c))

        retrieval_ms = int((time.perf_counter() - retrieval_started) * 1000)

        chat_history_dicts = [
            {"role": msg.role, "content": msg.content, "timestamp": msg.timestamp}
            for msg in req.chat_history
        ]

        memory_started = time.perf_counter()
        recent_messages, chat_summary = await memory_service.process_history(chat_history_dicts, None)
        memory_ms = int((time.perf_counter() - memory_started) * 1000)

        system_prompt = (
            req.system_prompt.strip()
            if (req.system_prompt or "").strip()
            else llm_service.build_multi_system_prompt(video_infos)
        )

        context = llm_service.LLMContext(
            system_prompt=system_prompt,
            retrieved_chunks=per_video_chunks,
            chat_summary=chat_summary,
            recent_messages=recent_messages,
            question=req.question,
        )

        llm_started = time.perf_counter()
        first = True
        async for chunk in llm_service.stream_chat_response(context):
            if first:
                first = False
                ttfb_ms = int((time.perf_counter() - llm_started) * 1000)
                meta: dict = {
                    "type": "meta",
                    "retrieval_ms": retrieval_ms,
                    "memory_ms": memory_ms,
                    "ttfb_ms": ttfb_ms,
                    "videos_count": len(selected_ids),
                    "retrieved_chunks_count": total_retrieved,
                }
                if req.debug and config.get("node_env") != "production":
                    meta["videos"] = video_infos
                meta_json = json.dumps(meta)
                yield f"data: {meta_json}\n\n"
            yield chunk

    except Exception as e:
        logger.exception("Multi chat error: {}", str(e))
        detail = (
            f"{type(e).__name__}: {str(e)}"
            if config.get("node_env") == "development"
            else "Failed to generate response. Please try again."
        )
        error_json = json.dumps({"type": "error", "message": detail})
        yield f"data: {error_json}\n\n"


def _format_retrieved_chunk(chunk: dict) -> str:
    text = (chunk or {}).get("text") or ""
    start_s = (chunk or {}).get("start_s")
    end_s = (chunk or {}).get("end_s")
    if start_s is None or end_s is None:
        return text
    return f"[{_format_time(start_s)}–{_format_time(end_s)}] {text}"


async def _collect_folder_source_ids(
    db: AsyncSession, workspace_id: str, folder_id: str,
) -> list[str]:
    """Recursively collect all source IDs from a folder and its descendants."""
    source_ids: list[str] = []

    # Sources directly in this folder
    src_result = await db.execute(
        select(Source.id).where(
            Source.workspace_id == workspace_id,
            Source.folder_id == folder_id,
        )
    )
    source_ids.extend(row[0] for row in src_result.fetchall())

    # Child folders
    child_result = await db.execute(
        select(Folder.id).where(
            Folder.workspace_id == workspace_id,
            Folder.parent_id == folder_id,
        )
    )
    for (child_id,) in child_result.fetchall():
        source_ids.extend(await _collect_folder_source_ids(db, workspace_id, child_id))

    return source_ids


def _format_time(seconds: float) -> str:
    s = max(0, int(seconds))
    h = s // 3600
    m = (s % 3600) // 60
    sec = s % 60
    return f"{h}:{m:02d}:{sec:02d}" if h > 0 else f"{m}:{sec:02d}"


def _parse_duration_to_seconds(duration: str) -> int:
    raw = (duration or "").strip()
    if not raw:
        return 0
    parts = raw.split(":")
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except Exception:
        return 0
    return 0


# ---------------------------------------------------------------------------
# Workspace chat — chat with sources in a workspace
# ---------------------------------------------------------------------------

@router.post("/workspace/{workspace_id}")
async def chat_workspace(
    workspace_id: str,
    req: WorkspaceChatRequest,
    response: Response,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream a chat response using sources in a workspace (SSE)."""

    async def generate():
        nonlocal db
        user_question = req.question
        full_response = ""

        try:
            # Verify workspace ownership
            ws_result = await db.execute(
                select(Workspace).where(Workspace.id == workspace_id, Workspace.owner_id == user.id)
            )
            if not ws_result.scalar_one_or_none():
                error_json = json.dumps({"type": "error", "message": "Workspace not found."})
                yield f"data: {error_json}\n\n"
                return

            # Determine source IDs
            source_id_list: list[str] | None = None
            if req.source_ids:
                source_id_list = req.source_ids
            elif req.folder_id:
                source_id_list = await _collect_folder_source_ids(db, workspace_id, req.folder_id)
                if not source_id_list:
                    error_json = json.dumps({"type": "error", "message": "No sources found in this folder."})
                    yield f"data: {error_json}\n\n"
                    return
            elif req.session_id:
                sess_result = await db.execute(
                    select(ChatSession).where(
                        ChatSession.id == req.session_id,
                        ChatSession.workspace_id == workspace_id,
                    )
                )
                sess = sess_result.scalar_one_or_none()
                if not sess:
                    error_json = json.dumps({"type": "error", "message": "Session not found."})
                    yield f"data: {error_json}\n\n"
                    return
                source_id_list = json.loads(sess.source_ids or "[]")
            else:
                source_id_list = []

            # Fetch sources
            if source_id_list:
                src_result = await db.execute(
                    select(Source).where(
                        Source.id.in_(source_id_list),
                        Source.workspace_id == workspace_id,
                        Source.status == "ready",
                    )
                )
            else:
                src_result = await db.execute(
                    select(Source).where(
                        Source.workspace_id == workspace_id,
                        Source.status == "ready",
                    )
                )
            sources = src_result.scalars().all()

            if not sources:
                error_json = json.dumps({"type": "error", "message": "No ready sources found in workspace."})
                yield f"data: {error_json}\n\n"
                return

            # Retrieve chunks from each source
            retrieval_started = time.perf_counter()
            all_chunks: list[str] = []
            source_infos: list[dict] = []

            for src in sources:
                meta = {}
                try:
                    meta = json.loads(src.metadata_json)
                except Exception:
                    pass

                collection_key = meta.get("video_id") or meta.get("index_key", "")
                if not collection_key:
                    continue

                source_infos.append({
                    "source_id": src.id,
                    "title": src.title,
                    "source_type": src.source_type,
                })

                retrieved = await embedding_service.retrieve_relevant_chunks(
                    collection_key, req.question,
                )
                for idx, c in enumerate(retrieved):
                    prefix = f"[{src.title} | Section {idx + 1}] "
                    all_chunks.append(prefix + _format_retrieved_chunk(c))

            retrieval_ms = int((time.perf_counter() - retrieval_started) * 1000)

            # Process chat history
            chat_history_dicts = [
                {"role": msg.role, "content": msg.content, "timestamp": msg.timestamp}
                for msg in req.chat_history
            ]

            memory_started = time.perf_counter()
            recent_messages, chat_summary = await memory_service.process_history(chat_history_dicts, None)
            memory_ms = int((time.perf_counter() - memory_started) * 1000)

            # Build system prompt
            system_prompt = llm_service.build_multi_system_prompt(source_infos)

            context = llm_service.LLMContext(
                system_prompt=system_prompt,
                retrieved_chunks=all_chunks,
                chat_summary=chat_summary,
                recent_messages=recent_messages,
                question=req.question,
            )

            # Stream
            llm_started = time.perf_counter()
            first = True
            async for chunk in llm_service.stream_chat_response(context):
                if first:
                    first = False
                    ttfb_ms = int((time.perf_counter() - llm_started) * 1000)
                    meta_event = json.dumps({
                        "type": "meta",
                        "retrieval_ms": retrieval_ms,
                        "memory_ms": memory_ms,
                        "ttfb_ms": ttfb_ms,
                        "sources_count": len(source_infos),
                        "retrieved_chunks_count": len(all_chunks),
                    })
                    yield f"data: {meta_event}\n\n"
                yield chunk
                if chunk.startswith("data: "):
                    try:
                        event = json.loads(chunk[6:])
                        if event.get("type") == "token":
                            full_response += event.get("content", "")
                    except Exception:
                        pass

            # Persist session + messages
            try:
                # Get or create session
                session_id = req.session_id
                if not session_id:
                    new_session = ChatSession(
                        workspace_id=workspace_id,
                        title=req.question[:80],
                        source_ids=json.dumps([s.id for s in sources]),
                        user_id=user.id,
                    )
                    db.add(new_session)
                    await db.commit()
                    await db.refresh(new_session)
                    session_id = new_session.id
                else:
                    sess_result = await db.execute(
                        select(ChatSession).where(
                            ChatSession.id == session_id,
                            ChatSession.workspace_id == workspace_id,
                        )
                    )
                    sess = sess_result.scalar_one_or_none()
                    if sess and sess.title == "New Chat":
                        sess.title = req.question[:80]
                        await db.commit()

                if session_id:
                    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    db.add(ChatMessageNew(session_id=session_id, role="user", content=user_question, timestamp=now))
                    db.add(ChatMessageNew(session_id=session_id, role="assistant", content=full_response, timestamp=now))
                    await db.commit()
            except Exception as save_err:
                logger.warning("Failed to save workspace chat: {}", save_err)

        except Exception as e:
            logger.exception("Workspace chat error: {}", str(e))
            detail = (
                f"{type(e).__name__}: {str(e)}"
                if config.get("node_env") == "development"
                else "Failed to generate response."
            )
            yield f"data: {json.dumps({'type': 'error', 'message': detail})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
