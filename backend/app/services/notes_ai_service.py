import json
from pydantic import BaseModel
from openai import AsyncOpenAI
from app.config import config
from app.utils.retry import retry

client = AsyncOpenAI(
    api_key=config["openai_api_key"],
    base_url=config.get("openai_base_url"),
)


class NoteAnalysis(BaseModel):
    topic: str
    tags: list[str]
    difficulty: str
    importance: int


ANALYSIS_PROMPT = """You are an AI note classifier. Analyze the following note content and return a JSON object with:

1. "topic": A short topic label (2-5 words) that best describes what this note is about. Use general subject areas like "React Hooks", "Machine Learning Basics", "Python Functions", "World War II", etc.
2. "tags": An array of 2-4 short keywords or phrases that capture key concepts in this note.
3. "difficulty": One of "beginner", "intermediate", or "advanced" — estimate the knowledge level needed to understand this note.
4. "importance": A number from 1 to 5 (1 = trivial, 5 = critical) indicating how important this information is.

Respond ONLY with a valid JSON object. Do not include any other text.

Note content:
"""


async def analyze_note(content: str) -> NoteAnalysis:
    truncated = content[:2000].strip()
    if not truncated:
        return NoteAnalysis(topic="", tags=[], difficulty="intermediate", importance=3)

    async def _call():
        resp = await client.chat.completions.create(
            model=config["openai_model"],
            messages=[{"role": "user", "content": ANALYSIS_PROMPT + truncated}],
            temperature=0.3,
            max_tokens=300,
            response_format={"type": "json_object"},
        )
        text = (resp.choices[0].message.content or "").strip()
        data = json.loads(text)
        return NoteAnalysis(
            topic=data.get("topic", ""),
            tags=data.get("tags", []),
            difficulty=data.get("difficulty", "intermediate") if data.get("difficulty") in ("beginner", "intermediate", "advanced") else "intermediate",
            importance=max(1, min(5, int(data.get("importance", 3)))),
        )

    return await retry(_call, max_attempts=2)
