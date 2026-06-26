from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

ChunkType = Literal["module_level", "function", "class", "block"]

EXTENSION_LANGUAGE_MAP: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".swift": "swift",
    ".rb": "ruby",
    ".php": "php",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".scala": "scala",
    ".clj": "clojure",
    ".cljs": "clojurescript",
    ".md": "markdown",
    ".rst": "rst",
    ".txt": "text",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".cfg": "ini",
    ".ini": "ini",
    ".conf": "ini",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".fish": "fish",
    ".sql": "sql",
    ".css": "css",
    ".scss": "scss",
    ".less": "less",
    ".html": "html",
    ".vue": "vue",
    ".svelte": "svelte",
    ".xml": "xml",
    ".graphql": "graphql",
    ".proto": "protobuf",
    ".dockerfile": "dockerfile",
}

FUNCTION_PATTERNS: dict[str, re.Pattern] = {
    "python": re.compile(r"^\s*(async\s+)?def\s+|^\s*class\s+|^\s*@"),
    "javascript": re.compile(
        r"^\s*(export\s+(default\s+)?)?(function\s+|class\s+|const\s+\w+\s*=\s*((async\s+)?\(|async\s+function))"
    ),
    "typescript": re.compile(
        r"^\s*(export\s+(default\s+)?)?(function\s+|class\s+|interface\s+|type\s+|const\s+\w+\s*=\s*((async\s+)?\(|async\s+function))"
    ),
    "go": re.compile(r"^\s*func\s"),
    "rust": re.compile(r"^\s*(pub(\s*\(.*\))?\s+)?(fn\s+|struct\s+|enum\s+|trait\s+|impl\s+|mod\s+|union\s+)"),
    "java": re.compile(
        r"^\s*(public|private|protected|static|abstract|final|synchronized|default)?"
        r"\s*(class|interface|enum|@interface)\s"
    ),
    "kotlin": re.compile(r"^\s*(fun\s+|class\s+|interface\s+|object\s+|enum\s+|data\s+class\s+|sealed\s+class\s+)"),
    "swift": re.compile(
        r"^\s*(public|private|internal|fileprivate|open)?\s*(func\s+|class\s+|struct\s+|enum\s+|protocol\s+|extension\s+)"
    ),
    "ruby": re.compile(r"^\s*(def\s+|class\s+|module\s+)"),
    "php": re.compile(
        r"^\s*(function\s+|class\s+|interface\s+|trait\s+|abstract\s+class\s+|"
        r"final\s+class\s+|(public|private|protected)\s+function\s+)"
    ),
    "csharp": re.compile(
        r"^\s*(public|private|protected|internal|static|abstract|virtual|override|async)?"
        r"\s*(class|struct|interface|enum|record)\s"
    ),
    "scala": re.compile(r"^\s*(def\s+|class\s+|object\s+|trait\s+|enum\s+|case\s+(class|object)\s+)"),
}


@dataclass
class CodeChunk:
    text: str
    file_path: str
    language: str
    chunk_type: ChunkType = "block"
    line_start: int = 1
    line_end: int = 1
    metadata: dict = field(default_factory=dict)


_BASENAME_LANGUAGE_MAP: dict[str, str] = {
    "dockerfile": "dockerfile",
    "makefile": "makefile",
}

def detect_language(file_path: str) -> str:
    ext = "." + file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""
    lang = EXTENSION_LANGUAGE_MAP.get(ext)
    if lang:
        return lang
    basename = file_path.rsplit("/", 1)[-1].lower() if "/" in file_path else file_path.lower()
    return _BASENAME_LANGUAGE_MAP.get(basename, "text")


def chunk_code_file(content: str, file_path: str, language: str | None = None) -> list[CodeChunk]:
    if language is None:
        language = detect_language(file_path)
    lines = content.rstrip("\n").split("\n")
    pattern = FUNCTION_PATTERNS.get(language)
    if pattern is None or language in ("markdown", "text"):
        return _chunk_by_paragraphs(lines, file_path, language)
    return _chunk_by_function_boundaries(lines, file_path, language, pattern)


def _chunk_by_function_boundaries(
    lines: list[str], file_path: str, language: str, pattern: re.Pattern
) -> list[CodeChunk]:
    chunks: list[CodeChunk] = []
    start = 0

    def _chunk_type(first_line: str) -> ChunkType:
        if pattern.search(first_line):
            return "class" if re.search(r"^\s*(class|interface|struct|enum|trait|protocol|object)\s", first_line) else "function"
        return "module_level" if not chunks else "function"

    for i, line in enumerate(lines):
        if pattern.search(line):
            if i > start:
                text = "\n".join(lines[start:i])
                if text.strip():
                    chunks.append(CodeChunk(text, file_path, language, _chunk_type(lines[start]), start + 1, i))
            start = i

    if start < len(lines):
        text = "\n".join(lines[start:])
        if text.strip():
            chunks.append(CodeChunk(text, file_path, language, _chunk_type(lines[start]), start + 1, len(lines)))

    return chunks if chunks else [CodeChunk("\n".join(lines), file_path, language, "module_level", 1, len(lines))]


def _chunk_by_paragraphs(lines: list[str], file_path: str, language: str) -> list[CodeChunk]:
    chunks: list[CodeChunk] = []
    start = 0
    current: list[str] = []

    for i, line in enumerate(lines):
        if line.strip() == "" and current:
            text = "\n".join(current)
            if text.strip():
                chunks.append(CodeChunk(text, file_path, language, "block", start + 1, i))
            current = []
            start = i + 1
        else:
            current.append(line)

    if current:
        text = "\n".join(current)
        if text.strip():
            chunks.append(CodeChunk(text, file_path, language, "block", start + 1, len(lines)))

    return chunks if chunks else [CodeChunk("\n".join(lines), file_path, language, "block", 1, len(lines))]
