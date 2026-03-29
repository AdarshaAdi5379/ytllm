import json
import google.generativeai as genai
from typing import AsyncGenerator

from app.config import config
from app.utils.retry import retry


genai.configure(api_key=config["google_api_key"])


class GeminiContext:
    def __init__(
        self,
        system_prompt: str,
        retrieved_chunks: list[str],
        chat_summary: str | None,
        recent_messages: list[dict],
        question: str,
    ):
        self.system_prompt = system_prompt
        self.retrieved_chunks = retrieved_chunks
        self.chat_summary = chat_summary
        self.recent_messages = recent_messages
        self.question = question


async def stream_chat_response(
    context: GeminiContext,
) -> AsyncGenerator[str, None]:
    """Assembles the full context payload and streams the Gemini response as SSE."""
    model_kwargs = {
        "model_name": config["gemini_model"],
        "generation_config": {"temperature": 0.2, "max_output_tokens": 1024},
    }
    if (context.system_prompt or "").strip():
        model_kwargs["system_instruction"] = context.system_prompt

    model = genai.GenerativeModel(**model_kwargs)

    # Build context content
    context_content = ""

    if context.retrieved_chunks:
        context_content += "\n\n[RELEVANT TRANSCRIPT SECTIONS]\n"
        for i, chunk in enumerate(context.retrieved_chunks):
            context_content += f"[Section {i + 1}]: {chunk}\n\n"

    if context.chat_summary:
        context_content += (
            f"\n\n[PREVIOUS CONVERSATION SUMMARY]\n{context.chat_summary}"
        )

    # Build history
    history_text = ""
    if context.recent_messages:
        history_text = "\n".join(
            f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')}"
            for m in context.recent_messages
        )

    # Compose final user message
    user_message_parts = []
    if history_text:
        user_message_parts.append("[RECENT CONVERSATION]\n" + history_text)
    if context_content:
        user_message_parts.append(context_content.strip())
    user_message_parts.append("[QUESTION]\n" + context.question)
    user_message = "\n\n".join(user_message_parts).strip()

    # Stream response
    def _start_stream():
        return model.generate_content(user_message, stream=True)

    stream = await retry(_start_stream, max_attempts=3)

    for chunk in stream:
        try:
            text = chunk.text
        except Exception:
            text = None
        if text:
            yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def generate_transcript_summary(transcript: str, title: str) -> str:
    """Generates a 150-word summary of the transcript."""
    model = genai.GenerativeModel(
        model_name=config["gemini_model"],
        generation_config={"temperature": 0.3, "max_output_tokens": 300},
    )

    # Use first ~8000 chars to avoid token limits
    truncated = transcript[:8000]

    prompt = f"""You are summarising a YouTube video titled "{title}". 
Write a concise 150-word summary of the following transcript that captures the main topics, key points, and conclusions. 
Be informative and neutral in tone.

Transcript:
{truncated}"""

    async def _generate():
        result = await model.generate_content_async(prompt)
        return result.text

    result = await retry(_generate, max_attempts=3)
    return result.strip()


async def generate_suggested_questions(transcript: str, title: str) -> list[str]:
    """Generates 5 suggested starter questions about the video."""
    model = genai.GenerativeModel(
        model_name=config["gemini_model"],
        generation_config={"temperature": 0.7, "max_output_tokens": 400},
    )

    truncated = transcript[:4000]

    prompt = f"""You are helping a user explore a YouTube video titled "{title}".
Generate exactly 5 insightful, specific questions a viewer might ask about this video's content.
Questions should be diverse — covering different aspects of the content.
Return ONLY the 5 questions, one per line, without numbering or bullet points.

Transcript excerpt:
{truncated}"""

    async def _generate():
        result = await model.generate_content_async(prompt)
        return result.text

    result = await retry(_generate, max_attempts=3)
    text = result.strip()

    questions = [q.strip() for q in text.split("\n") if len(q.strip()) > 10][:5]

    return questions


def build_system_prompt(
    title: str, channel_name: str, duration: str, summary: str
) -> str:
    """Builds the system prompt for a video session."""
    return f"""You are an AI assistant helping a user understand a YouTube video.

VIDEO INFORMATION:
- Title: {title}
- Channel: {channel_name}
- Duration: {duration}
- Summary: {summary}

STRICT RULES:
1. Answer ONLY based on the provided transcript context sections. 
2. If the answer is not in the transcript, say clearly: "This information isn't covered in the video."
3. Do NOT use outside knowledge or speculation.
4. Be concise and direct. Use bullet points for lists.
5. When referencing specific information, mention which part of the video it comes from if possible.
6. You are discussing THIS specific video only."""
