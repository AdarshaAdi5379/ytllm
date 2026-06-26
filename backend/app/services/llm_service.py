import json
from openai import AsyncOpenAI
from typing import AsyncGenerator

from app.config import config


client = AsyncOpenAI(
    api_key=config["openai_api_key"],
    base_url=config.get("openai_base_url"),
)


class LLMContext:
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


DEFAULT_MODEL = config["openai_model"]
DEFAULT_TEMPERATURE = 0.2


async def generate_text(
    prompt: str,
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> str:
    """Generate a non-streaming text completion."""
    resp = await client.chat.completions.create(
        model=model or DEFAULT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return (resp.choices[0].message.content or "").strip()


async def stream_chat_response(
    context: LLMContext,
    model: str | None = None,
    temperature: float | None = None,
) -> AsyncGenerator[str, None]:
    """Assembles the full context payload and streams the OpenAI response as SSE."""
    messages: list[dict] = []

    if (context.system_prompt or "").strip():
        messages.append({"role": "system", "content": context.system_prompt})

    context_content = ""

    if context.retrieved_chunks:
        context_content += "\n\n[RELEVANT TRANSCRIPT SECTIONS]\n"
        for i, chunk in enumerate(context.retrieved_chunks):
            context_content += f"[Section {i + 1}]: {chunk}\n\n"

    if context.chat_summary:
        context_content += (
            f"\n\n[PREVIOUS CONVERSATION SUMMARY]\n{context.chat_summary}"
        )

    history_text = ""
    if context.recent_messages:
        history_text = "\n".join(
            f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')}"
            for m in context.recent_messages
        )

    user_message_parts = []
    if history_text:
        user_message_parts.append("[RECENT CONVERSATION]\n" + history_text)
    if context_content:
        user_message_parts.append(context_content.strip())
    user_message_parts.append("[QUESTION]\n" + context.question)
    user_message = "\n\n".join(user_message_parts).strip()

    messages.append({"role": "user", "content": user_message})

    stream = await client.chat.completions.create(
        model=model or DEFAULT_MODEL,
        messages=messages,
        temperature=temperature if temperature is not None else DEFAULT_TEMPERATURE,
        max_tokens=1024,
        stream=True,
    )

    async for chunk in stream:
        text = chunk.choices[0].delta.content
        if text:
            yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def generate_transcript_summary(transcript: str, title: str) -> str:
    """Generates a 150-word summary of the transcript."""
    truncated = transcript[:8000]

    prompt = f"""You are summarising a YouTube video titled "{title}".
Write a concise 150-word summary of the following transcript that captures the main topics, key points, and conclusions.
Be informative and neutral in tone.

Transcript:
{truncated}"""

    resp = await client.chat.completions.create(
        model=config["openai_model"],
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=300,
    )
    return (resp.choices[0].message.content or "").strip()


async def generate_suggested_questions(transcript: str, title: str) -> list[str]:
    """Generates 5 suggested starter questions about the video."""
    truncated = transcript[:4000]

    prompt = f"""You are helping a user explore a YouTube video titled "{title}".
Generate exactly 5 insightful, specific questions a viewer might ask about this video's content.
Questions should be diverse — covering different aspects of the content.
Return ONLY the 5 questions, one per line, without numbering or bullet points.

Transcript excerpt:
{truncated}"""

    resp = await client.chat.completions.create(
        model=config["openai_model"],
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=400,
    )
    text = (resp.choices[0].message.content or "").strip()

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
1. Answer factual questions ONLY based on the provided transcript context sections.
2. If the answer to a factual question is not in the transcript, say clearly: "This information isn't covered in the video."
3. Do NOT use outside knowledge or speculation for video content.
4. Be concise and direct. Use bullet points for lists.
5. When referencing specific information, mention which part of the video it comes from if possible.
6. You are discussing THIS specific video only.
7. Handle casual conversation naturally — greetings ("hi", "hello"), thanks, goodbyes, and simple social chat do NOT require transcript context. Respond warmly and keep the conversation going.
8. TIMESTAMP CITATION: Transcript sections include timestamp ranges like [M:SS–M:SS]. When you reference a specific moment, cite its starting timestamp in [MM:SS] format at the end of the relevant sentence. For example: "The author introduces the transformer architecture at [12:30]." Use the start time of the relevant section. Do NOT fabricate timestamps — only cite them when you can clearly map the information to a specific section."""


def build_multi_system_prompt(videos: list[dict]) -> str:
    lines = []
    for v in videos:
        title = v.get("title") or "Unknown"
        vid = v.get("video_id") or ""
        channel = v.get("channel_name") or ""
        duration = v.get("duration") or ""
        lines.append(f"- {title} ({vid}) — {channel} — {duration}".strip())

    video_list = "\n".join(lines) if lines else "- (no videos)"

    return f"""You are an AI assistant helping a user answer questions across multiple sources.

SOURCES:
{video_list}

CRITICAL CITATION RULE: When you reference information from a source, you MUST cite the source's number in square brackets, e.g. [1] or [2]. Place the citation at the end of the relevant sentence. Every factual claim must have a citation.

STRICT RULES:
1. Answer factual questions ONLY based on the provided context sections.
2. If the answer to a factual question is not in the context, say clearly: "This information isn't covered in the provided sources."
3. Do NOT use outside knowledge or speculation.
4. Be concise and direct. Use bullet points for lists.
5. If sources disagree, explicitly call out the disagreement and cite each source.
6. Handle casual conversation naturally — greetings ("hi", "hello"), thanks, goodbyes, and simple social chat do NOT require citations. Respond warmly and keep the conversation going.
7. TIMESTAMP CITATION: When transcript sections include timestamp ranges like [M:SS–M:SS], cite the starting timestamp in [MM:SS] format when referencing specific moments. Place the timestamp after the relevant sentence, before the [N] source citation."""
