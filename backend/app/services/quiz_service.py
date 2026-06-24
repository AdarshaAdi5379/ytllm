import json
import random
from loguru import logger
from app.services import llm_service


MCQ_PROMPT = """You are a quiz generation assistant. Given the following source content, create a multiple-choice quiz.

Return a JSON array of question objects with these fields:
- id (string): unique identifier like "q1", "q2", etc.
- question (string): Clear, specific question
- options (array of 4 strings): Answer choices labeled A-D
- correct_answer (integer): Index (0-3) of the correct option
- explanation (string): Why this answer is correct, referencing the source

Rules:
- Questions should test understanding, not just memorization
- Distractors should be plausible but incorrect
- Each question must have exactly 4 options
- Vary difficulty across questions
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text

Source title: {title}
Source type: {source_type}

Content:
{content}

JSON questions:"""

CODING_PROMPT = """You are a coding quiz generation assistant. Given the following source content, create coding questions.

Return a JSON array of question objects with these fields:
- id (string): unique identifier like "q1", "q2", etc.
- question (string): Problem description with clear requirements
- language (string): Programming language (e.g., "python", "javascript")
- starter_code (string): Template code the user will complete
- expected_solution (string): Correct solution code
- test_cases (array of objects): Each with "input" and "expected_output"
- explanation (string): Explanation of the solution approach and key concepts tested

Rules:
- Cover concepts from the source content
- Include at least 2 test cases per question
- Starter code should have a function signature and comments where user fills in
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text

Source title: {title}
Source type: {source_type}

Content:
{content}

JSON questions:"""

SHORT_ANSWER_PROMPT = """You are a quiz generation assistant. Given the following source content, create short-answer questions.

Return a JSON array of question objects with these fields:
- id (string): unique identifier like "q1", "q2", etc.
- question (string): Clear, focused question requiring a concise answer (1-3 sentences)
- expected_answer (string): The ideal concise answer
- key_points (array of strings): Specific concepts the answer should include
- explanation (string): Brief explanation of why this answer is correct

Rules:
- Questions should target specific concepts from the content
- Expected answer should be 1-3 sentences max
- Key points are the essential components for scoring
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text

Source title: {title}
Source type: {source_type}

Content:
{content}

JSON questions:"""

LONG_ANSWER_PROMPT = """You are a quiz generation assistant. Given the following source content, create essay-style long-answer questions.

Return a JSON array of question objects with these fields:
- id (string): unique identifier like "q1", "q2", etc.
- question (string): Open-ended prompt requiring a detailed essay response
- rubric (array of objects): Each with "criterion" (string) and "points" (integer, 0-10) describing grading criteria
- expected_key_points (array of strings): Core concepts the answer should cover
- suggested_length (string): e.g., "300-500 words"
- explanation (string): How to approach answering this question

Rules:
- Prompts should require synthesis of multiple concepts from the content
- Rubric should have 3-5 criteria with point values
- Questions should test depth of understanding
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text

Source title: {title}
Source type: {source_type}

Content:
{content}

JSON questions:"""

CASE_STUDY_PROMPT = """You are a quiz generation assistant. Given the following source content, create case study analysis questions.

Return a JSON array of question objects with these fields:
- id (string): unique identifier like "q1", "q2", etc.
- scenario (string): A realistic scenario based on the source content
- questions (array of objects): Each with "id" ("sq1", "sq2"), "question" (string), and "expected_answer" (string)
- difficulty (string): "easy", "medium", or "hard"
- explanation (string): What this case study tests and how to approach it

Rules:
- Scenarios should apply concepts from the source to realistic situations
- Each case study has 2-4 sub-questions
- Sub-questions should test analysis, application, and evaluation
- Return exactly {count} case studies as a JSON array
- Return ONLY the JSON array, no other text

Source title: {title}
Source type: {source_type}

Content:
{content}

JSON questions:"""

INTERVIEW_PROMPT = """You are a quiz generation assistant. Given the following source content, create interview-style questions for a specific role.

Return a JSON array of question objects with these fields:
- id (string): unique identifier like "q1", "q2", etc.
- question (string): Interview-style question relevant to the role
- expected_answer (string): What a strong candidate should cover
- role (string): The role this question is relevant for
- difficulty (string): "easy", "medium", "hard"
- category (string): "technical", "behavioral", "system_design", "theory"
- tips (array of strings): Tips for answering well
- follow_up (array of strings): Potential follow-up questions

Rules:
- Questions should be realistic interview questions
- Cover multiple categories where applicable
- Include both technical and conceptual questions
- Provide actionable tips
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text

Source title: {title}
Source type: {source_type}

Content:
{content}

JSON questions:"""


PROMPT_MAP = {
    "mcq": MCQ_PROMPT,
    "coding": CODING_PROMPT,
    "short_answer": SHORT_ANSWER_PROMPT,
    "long_answer": LONG_ANSWER_PROMPT,
    "case_study": CASE_STUDY_PROMPT,
    "interview": INTERVIEW_PROMPT,
}


async def generate_quiz(
    source_title: str,
    source_type: str,
    raw_text: str,
    quiz_type: str = "mcq",
    count: int = 5,
) -> list[dict]:
    """Generate quiz questions from source content using AI."""
    if not raw_text.strip():
        raise ValueError("Source has no content.")

    prompt_template = PROMPT_MAP.get(quiz_type)
    if not prompt_template:
        raise ValueError(f"Unknown quiz type: {quiz_type}")

    prompt = prompt_template.format(
        title=source_title,
        source_type=source_type,
        content=raw_text[:10000],
        count=count,
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
        questions = json.loads(cleaned)
        if not isinstance(questions, list):
            raise ValueError("Response is not a list")
        return questions
    except json.JSONDecodeError as e:
        logger.exception("Failed to parse quiz generation response: {}", e)
        raise ValueError("Failed to parse AI response as JSON.") from e
    except Exception as e:
        logger.exception("Quiz generation failed: {}", e)
        raise


def score_quiz(questions: list[dict], answers: list[dict]) -> tuple[int, int]:
    """Score a quiz. Returns (score, max_score).

    For MCQ, correct_answer index is compared.
    For all types, partial credit isn't given in this basic scorer.
    """
    score = 0
    max_score = len(questions)

    answer_map = {a.get("question_id"): a.get("answer") for a in answers}

    for q in questions:
        qid = q.get("id")
        user_ans = answer_map.get(qid)
        if user_ans is None:
            continue

        if q.get("type") == "mcq" or "options" in q:
            correct = q.get("correct_answer")
            if isinstance(user_ans, int) and user_ans == correct:
                score += 1
            elif isinstance(user_ans, str) and user_ans.isdigit():
                if int(user_ans) == correct:
                    score += 1
        else:
            expected = q.get("expected_answer") or q.get("expected_solution") or ""
            if user_ans and expected and str(user_ans).strip().lower() == expected.strip().lower():
                score += 1

    return score, max_score
