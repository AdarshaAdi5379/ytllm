from openai import AsyncOpenAI
from app.config import config
from app.utils.retry import retry

client = AsyncOpenAI(
    api_key=config["openai_api_key"],
    base_url=config.get("openai_base_url"),
)

ACTION_PROMPTS = {
    "explain": """You are an expert tutor. Explain the following concept from the source content in a clear, step-by-step manner. Break it down into simple parts, define any jargon, and build up from basics to details. Use examples where helpful.

Concept to explain: {concept}

Source content:
{content}""",

    "simplify": """You are a simplification expert. Rewrite the following source content in plain, simple language. Use short sentences, common words, and clear structure. Make it accessible to someone with no background in this topic. Keep all key information but remove unnecessary complexity.

Source content:
{content}""",

    "translate": """You are a professional translator. Translate the following source content into {language}. Preserve meaning, tone, and technical accuracy. Keep formatting and structure intact. Provide only the translation, no explanations.

Source content:
{content}""",

    "expand": """You are a knowledgeable expert. Elaborate on the following source content about "{topic}". Add relevant context, deeper explanations, real-world applications, and connections to related concepts. Stay factual and well-reasoned. Aim for comprehensive coverage.

Source content:
{content}""",

    "compare": """You are an expert analyst. Compare and contrast the following two concepts based on the source content. Use a structured format covering: definitions, key similarities, key differences, practical implications, and which is better for what use case.

Concept 1: {concept1}
Concept 2: {concept2}

Source content:
{content}""",

    "examples": """You are a creative educator. Generate 3-5 concrete, real-world examples that illustrate the concept of "{concept}" based on the source content. Each example should be distinct, practical, and help the reader understand the concept. Explain how each example relates to the concept.

Source content:
{content}""",

    "code": """You are an expert programmer. Based on the following source content, generate code that demonstrates or implements the described functionality. Include clear comments explaining each section. Use modern, idiomatic syntax. If the source describes a specific language, use that language; otherwise use Python.

Description: {description}

Source content:
{content}""",

    "quiz": """You are an expert quiz creator. Based on the following source content, generate a quiz with:
- 5 multiple-choice questions (4 options each, one correct answer)
- 3 short-answer questions
- 1 coding/written exercise question

Format the quiz as follows:

## Multiple Choice
1. [Question]
   a) [option]
   b) [option]
   c) [option]
   d) [option]
   **Answer:** [letter]

## Short Answer
1. [Question]
   **Answer:** [expected answer]

## Exercise
[Description of the exercise]

Source content:
{content}""",
}


async def run_action(
    action_type: str,
    source_title: str,
    raw_text: str,
    params: dict | None = None,
) -> str:
    prompt_template = ACTION_PROMPTS.get(action_type)
    if not prompt_template:
        raise ValueError(f"Unknown action type: {action_type}")

    truncated = raw_text[:8000]
    params = params or {}

    prompt = prompt_template.format(content=truncated, **params)

    async def _call():
        resp = await client.chat.completions.create(
            model=config["openai_model"],
            messages=[
                {"role": "system", "content": f"You are performing a '{action_type}' action on content from '{source_title}'."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2048,
        )
        return (resp.choices[0].message.content or "").strip()

    return await retry(_call, max_attempts=2)
