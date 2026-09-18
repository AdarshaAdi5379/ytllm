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
- topic (string): The specific sub-topic or concept this question tests (e.g. "Deadlocks", "Memory Management")

Rules:
- Questions should test understanding, not just memorization
- Distractors should be plausible but incorrect
- Each question must have exactly 4 options
- Vary difficulty across questions
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text
{focus_instruction}
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
- topic (string): The specific sub-topic or concept this question tests

Rules:
- Cover concepts from the source content
- Include at least 2 test cases per question
- Starter code should have a function signature and comments where user fills in
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text
{focus_instruction}
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
- topic (string): The specific sub-topic or concept this question tests

Rules:
- Questions should target specific concepts from the content
- Expected answer should be 1-3 sentences max
- Key points are the essential components for scoring
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text
{focus_instruction}
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
- topic (string): The specific sub-topic or concept this question tests

Rules:
- Prompts should require synthesis of multiple concepts from the content
- Rubric should have 3-5 criteria with point values
- Questions should test depth of understanding
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text
{focus_instruction}
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
- topic (string): The specific sub-topic or concept this case study tests

Rules:
- Scenarios should apply concepts from the source to realistic situations
- Each case study has 2-4 sub-questions
- Sub-questions should test analysis, application, and evaluation
- Return exactly {count} case studies as a JSON array
- Return ONLY the JSON array, no other text
{focus_instruction}
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
- topic (string): The specific sub-topic or concept this question tests

Rules:
- Questions should be realistic interview questions
- Cover multiple categories where applicable
- Include both technical and conceptual questions
- Provide actionable tips
- Return exactly {count} questions as a JSON array
- Return ONLY the JSON array, no other text
{focus_instruction}
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
    focus_topics: list[str] | None = None,
) -> list[dict]:
    """Generate quiz questions from source content using AI."""
    if not raw_text.strip():
        raise ValueError("Source has no content.")

    prompt_template = PROMPT_MAP.get(quiz_type)
    if not prompt_template:
        raise ValueError(f"Unknown quiz type: {quiz_type}")

    focus_instruction = ""
    if focus_topics:
        focus_instruction = f"- IMPORTANT FOCUS: Prioritize testing knowledge on these specific weak topics/concepts: {', '.join(focus_topics)}.\n"

    prompt = prompt_template.format(
        title=source_title,
        source_type=source_type,
        content=raw_text[:10000],
        count=count,
        focus_instruction=focus_instruction,
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
        for q in questions:
            if not q.get("topic"):
                q["topic"] = source_title
        return questions
    except json.JSONDecodeError as e:
        logger.exception("Failed to parse quiz generation response: {}", e)
        raise ValueError("Failed to parse AI response as JSON.") from e
    except Exception as e:
        logger.exception("Quiz generation failed: {}", e)
        raise


NON_MCQ_EVALUATION_PROMPT = """You are an expert grading assistant.
Grade the learner's answer to the following question.

Question Type: {quiz_type}
Question: {question}
Expected Answer / Rubric / Solution: {expected}
Key Points: {key_points}

Learner's Answer:
{user_answer}

Evaluate the learner's response for factual correctness, conceptual understanding, and completeness.
Return a JSON object with:
- "score": Float between 0.0 and 1.0 (e.g. 1.0 for completely correct/sufficient, 0.5-0.8 for partially correct, 0.0 for incorrect/irrelevant)
- "is_correct": Boolean (true if score >= 0.6, false otherwise)
- "feedback": Short 1-2 sentence explanation of the grade

JSON:"""


def _heuristic_grade_non_mcq(q: dict, user_ans: str) -> tuple[bool, float]:
    """Fallback grading heuristic when LLM is unavailable."""
    clean_user = user_ans.strip().lower()
    if not clean_user:
        return False, 0.0

    expected = str(q.get("expected_answer") or q.get("expected_solution") or "").strip().lower()
    if expected and clean_user == expected:
        return True, 1.0

    # Check key points / keywords if present
    key_points = q.get("key_points") or q.get("expected_key_points") or []
    if key_points:
        matched_kp = sum(1 for kp in key_points if str(kp).lower() in clean_user)
        ratio = matched_kp / len(key_points)
        if ratio >= 0.6:
            return True, round(ratio, 2)
        elif ratio > 0.2:
            return False, round(ratio, 2)

    # Substring / overlap check
    if expected and (expected in clean_user or clean_user in expected):
        return True, 0.8

    # Non-empty meaningful attempt heuristic
    if len(clean_user.split()) >= 4:
        return True, 0.6

    return False, 0.0


async def evaluate_non_mcq_answer(q: dict, user_ans: str) -> tuple[bool, float, str]:
    """Grade a non-MCQ answer using LLM with heuristic fallback."""
    clean_user = str(user_ans).strip()
    if not clean_user:
        return False, 0.0, "No answer provided."

    expected = str(q.get("expected_answer") or q.get("expected_solution") or q.get("rubric") or "")
    key_points = str(q.get("key_points") or q.get("expected_key_points") or "")

    prompt = NON_MCQ_EVALUATION_PROMPT.format(
        quiz_type=q.get("type", "short_answer"),
        question=q.get("question", ""),
        expected=expected,
        key_points=key_points,
        user_answer=clean_user,
    )

    try:
        raw = await llm_service.generate_text(prompt, temperature=0.2, max_tokens=256)
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            score = float(parsed.get("score", 0.0))
            score = max(0.0, min(1.0, score))
            is_correct = bool(parsed.get("is_correct", score >= 0.6))
            feedback = str(parsed.get("feedback", ""))
            return is_correct, score, feedback
    except Exception as e:
        logger.warning("LLM non-mcq answer evaluation failed, using fallback: {}", e)

    is_corr, sc = _heuristic_grade_non_mcq(q, clean_user)
    return is_corr, sc, "Evaluated with standard criteria."


async def score_quiz_async(
    questions: list[dict], answers: list[dict]
) -> tuple[int, int, list[dict]]:
    """Score a quiz asynchronously supporting both MCQ and non-MCQ grading."""
    score = 0
    max_score = len(questions)
    details: list[dict] = []

    answer_map = {a.get("question_id"): a.get("answer") for a in answers}

    for q in questions:
        qid = q.get("id")
        topic = q.get("topic")
        user_ans = answer_map.get(qid)
        is_correct = False
        item_score = 0.0

        if user_ans is not None:
            # Check if MCQ
            if q.get("type") == "mcq" or "options" in q:
                correct = q.get("correct_answer")
                if isinstance(user_ans, int) and user_ans == correct:
                    is_correct = True
                    item_score = 1.0
                elif isinstance(user_ans, str) and user_ans.isdigit():
                    if int(user_ans) == correct:
                        is_correct = True
                        item_score = 1.0
            else:
                # Non-MCQ: Evaluate via LLM / heuristic
                is_correct, item_score, _ = await evaluate_non_mcq_answer(q, str(user_ans))

        if is_correct:
            score += 1

        details.append({
            "question_id": qid,
            "topic": topic,
            "is_correct": is_correct,
            "score": item_score,
        })

    return score, max_score, details


def score_quiz(questions: list[dict], answers: list[dict]) -> tuple[int, int]:
    """Score a quiz. Returns (score, max_score)."""
    score, max_score, _ = score_quiz_with_details(questions, answers)
    return score, max_score


def score_quiz_with_details(
    questions: list[dict], answers: list[dict]
) -> tuple[int, int, list[dict]]:
    """Score a quiz and return detailed correctness breakdown per question and topic."""
    score = 0
    max_score = len(questions)
    details: list[dict] = []

    answer_map = {a.get("question_id"): a.get("answer") for a in answers}

    for q in questions:
        qid = q.get("id")
        topic = q.get("topic")
        user_ans = answer_map.get(qid)
        is_correct = False
        item_score = 0.0

        if user_ans is not None:
            if q.get("type") == "mcq" or "options" in q:
                correct = q.get("correct_answer")
                if isinstance(user_ans, int) and user_ans == correct:
                    is_correct = True
                    item_score = 1.0
                elif isinstance(user_ans, str) and user_ans.isdigit():
                    if int(user_ans) == correct:
                        is_correct = True
                        item_score = 1.0
            else:
                is_correct, item_score = _heuristic_grade_non_mcq(q, str(user_ans))

        if is_correct:
            score += 1

        details.append({
            "question_id": qid,
            "topic": topic,
            "is_correct": is_correct,
            "score": item_score,
        })

    return score, max_score, details
