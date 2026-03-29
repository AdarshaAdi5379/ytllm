import json
import time
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

from app.services import embedding_service
from app.services import memory_service
from app.services import gemini_service
from app.models import Message
from app.config import config


router = APIRouter()


class ChatRequest(BaseModel):
    video_id: str
    question: str
    chat_history: List[Message] = []
    system_prompt: str = ""
    debug: bool = False


async def generate_stream(req: ChatRequest):
    """Generator function for streaming SSE response."""
    try:
        # 1. Retrieve relevant transcript chunks
        retrieval_started = time.perf_counter()
        retrieved_chunks = await embedding_service.retrieve_relevant_chunks(
            req.video_id, req.question
        )
        retrieval_ms = int((time.perf_counter() - retrieval_started) * 1000)

        # 2. Process chat history (rolling summary if needed)
        chat_history_dicts = [
            {"role": msg.role, "content": msg.content, "timestamp": msg.timestamp}
            for msg in req.chat_history
        ]

        memory_started = time.perf_counter()
        recent_messages, chat_summary = await memory_service.process_history(
            chat_history_dicts, None
        )
        memory_ms = int((time.perf_counter() - memory_started) * 1000)

        # 3. Stream Gemini response
        context = gemini_service.GeminiContext(
            system_prompt=req.system_prompt,
            retrieved_chunks=retrieved_chunks,
            chat_summary=chat_summary,
            recent_messages=recent_messages,
            question=req.question,
        )

        llm_started = time.perf_counter()
        first = True
        async for chunk in gemini_service.stream_chat_response(context):
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

    except Exception as e:
        print(f"Chat error: {str(e)}")
        detail = (
            f"{type(e).__name__}: {str(e)}"
            if config.get("node_env") == "development"
            else "Failed to generate response. Please try again."
        )
        error_json = json.dumps(
            {
                "type": "error",
                "message": detail,
            }
        )
        yield f"data: {error_json}\n\n"


@router.post("/")
async def chat(req: ChatRequest):
    """Stream a Gemini AI response (SSE)."""
    return StreamingResponse(
        generate_stream(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
