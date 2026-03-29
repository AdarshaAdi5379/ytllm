import google.generativeai as genai

from app.config import config
from app.utils.retry import retry


genai.configure(api_key=config["google_api_key"])


async def summarise_chat_history(old_messages: list[dict]) -> str:
    """Summarises old messages in a conversation to keep context compact."""
    model = genai.GenerativeModel(
        model_name=config["gemini_model"],
        generation_config={"temperature": 0.3, "max_output_tokens": 300},
    )

    history_text = "\n".join(
        f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')}"
        for m in old_messages
    )

    prompt = f"""Summarise this conversation history concisely in 3-5 sentences, preserving key facts and decisions discussed:

{history_text}"""

    async def _generate():
        result = await model.generate_content_async(prompt)
        return result.text

    result_text = await retry(_generate, max_attempts=3)
    return (result_text or "").strip()


async def process_history(
    chat_history: list[dict], existing_summary: str | None
) -> tuple[list[dict], str | None]:
    """
    Checks if the chat history needs summarisation and returns the processed history.
    Returns: (recent_messages, summary)
    """
    threshold = config["chat_history_threshold"]
    window_size = config["chat_window_size"]

    if len(chat_history) <= threshold:
        return chat_history, existing_summary

    # Split: older messages get summarised, last N messages stay as full context
    older_messages = (
        chat_history[:-window_size] if window_size < len(chat_history) else []
    )
    recent_messages = chat_history[-window_size:]

    # Build summary from existing summary + older messages
    messages_to_summarise = (
        [
            {
                "role": "assistant",
                "content": f"[Previous conversation summary]: {existing_summary}",
                "timestamp": "",
            }
        ]
        + older_messages
        if existing_summary
        else older_messages
    )

    if messages_to_summarise:
        new_summary = await summarise_chat_history(messages_to_summarise)
    else:
        new_summary = existing_summary

    return recent_messages, new_summary
