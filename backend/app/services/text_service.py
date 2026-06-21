import hashlib


class TextResult:
    def __init__(self, title: str, text: str, index_key: str):
        self.title = title
        self.text = text
        self.index_key = index_key


def content_to_index_key(content: str) -> str:
    return "txt_" + hashlib.sha256(content.encode()).hexdigest()[:16]


def process_text(content: str, title: str = "") -> TextResult:
    stripped = content.strip()
    if len(stripped) < 50:
        raise ValueError("Text content must be at least 50 characters.")

    title = title.strip() or (stripped.split("\n")[0][:200] if stripped else "Untitled Text")
    index_key = content_to_index_key(stripped)

    return TextResult(title=title, text=stripped, index_key=index_key)
