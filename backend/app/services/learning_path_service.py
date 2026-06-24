import json
from loguru import logger
from app.services import llm_service


GENERATION_PROMPT = """You are a learning path architect. Given workspace content with multiple sources, create a structured, personalized learning roadmap.

Analyze the sources and identify:
1. The core subject or domain being studied
2. Prerequisite knowledge assumed
3. Logical progression of topics from foundational to advanced
4. Which sources support each topic

Return a JSON object with:
- title (string): A concise, descriptive title for this learning path
- description (string): 2-3 sentence overview of what this path covers and who it's for
- topics (array of objects): Each topic has:
  - title (string): Clear topic name
  - description (string): What the learner will understand after this topic
  - sort_order (integer): Sequential order starting from 0
  - estimated_minutes (integer): Estimated time in minutes to complete

Rules:
- Topics must flow logically from foundational to advanced
- Each topic should build on previous ones
- Cover the breadth of content from all sources
- Identify 4-12 topics depending on content scope
- Use clear, learner-friendly language
- Return ONLY the JSON object, no other text

Focus area (optional): {focus_area}

Available sources:
{sources_text}

JSON learning path:"""


async def generate_learning_path(
    sources: list[dict],
    focus_area: str = "",
) -> dict:
    """Generate a structured learning path from workspace sources using AI."""
    if not sources:
        raise ValueError("No sources available for analysis.")

    sources_text = "\n---\n".join(
        f"Title: {s.get('title', 'Untitled')}\n"
        f"Type: {s.get('source_type', 'unknown')}\n"
        f"Content preview: {s.get('raw_text', '')[:2000]}"
        for s in sources
    )

    prompt = GENERATION_PROMPT.format(
        sources_text=sources_text[:15000],
        focus_area=focus_area or "General - cover all topics from the sources",
    )

    try:
        response = await llm_service.generate_text(prompt, max_tokens=8192)
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        result = json.loads(cleaned)
        if not isinstance(result, dict):
            raise ValueError("Response is not a JSON object")
        if "topics" not in result or not isinstance(result["topics"], list):
            raise ValueError("Response missing 'topics' array")
        return result
    except json.JSONDecodeError as e:
        logger.exception("Failed to parse learning path generation response: {}", e)
        raise ValueError("Failed to parse AI response as JSON.") from e
    except Exception as e:
        logger.exception("Learning path generation failed: {}", e)
        raise
