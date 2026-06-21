from openai import AsyncOpenAI
from app.config import config
from app.utils.retry import retry

client = AsyncOpenAI(
    api_key=config["openai_api_key"],
    base_url=config.get("openai_base_url"),
)

SUMMARY_PROMPTS = {
    "short": "Write a concise 2-3 sentence TL;DR summary of the following content. Capture the single most important takeaway.",
    "detailed": "Write a comprehensive multi-paragraph summary (~500 words) of the following content. Cover all major topics, arguments, examples, and conclusions in detail.",
    "executive": "Write an executive summary of the following content using bullet points. Each bullet should capture one key insight, finding, or recommendation. Be direct and actionable.",
    "eli5": "Explain the following content like I'm 5 years old. Use simple language, analogies, and everyday examples. Avoid jargon entirely. The goal is to make the core concepts understandable to a child.",
    "interview": "Extract the following content into an interview-style Q&A format. Identify 5-8 key questions that the content answers, and provide concise answers based strictly on the text.",
    "revision": "Extract key facts, dates, formulas, concepts, terminology, and definitions from the following content. Organize them into clear sections. This should serve as quick revision material.",
}


async def generate_summary(source_type: str, title: str, raw_text: str, summary_type: str) -> str:
    prompt_template = SUMMARY_PROMPTS.get(summary_type)
    if not prompt_template:
        raise ValueError(f"Unknown summary type: {summary_type}")

    truncated = raw_text[:10000]

    prompt = f"""{prompt_template}

Source type: {source_type}
Title: {title}

Content:
{truncated}"""

    async def _call():
        resp = await client.chat.completions.create(
            model=config["openai_model"],
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2048,
        )
        return (resp.choices[0].message.content or "").strip()

    return await retry(_call, max_attempts=2)
