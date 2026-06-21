import hashlib


class MarkdownResult:
    def __init__(self, title: str, text: str, index_key: str):
        self.title = title
        self.text = text
        self.index_key = index_key


def content_to_index_key(content: str) -> str:
    return "md_" + hashlib.sha256(content.encode()).hexdigest()[:16]


def process_markdown(content: str, title: str = "") -> MarkdownResult:
    stripped = content.strip()
    if len(stripped) < 50:
        raise ValueError("Markdown content must be at least 50 characters.")

    title = title.strip() or (stripped.split("\n")[0][:200] if stripped else "Untitled Markdown")
    index_key = content_to_index_key(stripped)

    return MarkdownResult(title=title, text=stripped, index_key=index_key)
