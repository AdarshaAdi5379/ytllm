import json
from loguru import logger
from app.services import llm_service


GENERATION_PROMPT = """You are a flashcard generation assistant. Given the following source content, extract the most important facts and create question-answer pairs.

Return a JSON array of objects with these fields:
- question (string): A clear, specific question about a key fact
- answer (string): The precise answer to the question
- difficulty (string): One of "easy", "medium", "hard"

Rules:
- Focus on factual, testable information from the content
- Each flashcard should cover one distinct concept
- Questions should be specific and unambiguous
- Answers should be concise but complete
- Include a mix of easy, medium, and hard questions
- Return exactly {count} flashcards as a JSON array
- Return ONLY the JSON array, no other text

Source title: {title}
Source type: {source_type}

Content:
{content}

JSON flashcards:"""


async def generate_flashcards(
    source_title: str,
    source_type: str,
    raw_text: str,
    count: int = 10,
) -> list[dict]:
    """Generate flashcards from source content using AI."""
    if not raw_text.strip():
        raise ValueError("Source has no content.")

    prompt = GENERATION_PROMPT.format(
        title=source_title,
        source_type=source_type,
        content=raw_text[:8000],
        count=count,
    )

    try:
        response = await llm_service.generate_text(prompt, max_tokens=4096)
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        flashcards = json.loads(cleaned)
        if not isinstance(flashcards, list):
            raise ValueError("Response is not a list")
        for fc in flashcards:
            fc.setdefault("difficulty", "medium")
        return flashcards
    except json.JSONDecodeError as e:
        logger.exception("Failed to parse flashcard generation response: {}", e)
        raise ValueError("Failed to parse AI response as JSON.") from e
    except Exception as e:
        logger.exception("Flashcard generation failed: {}", e)
        raise
