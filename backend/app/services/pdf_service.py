import hashlib
import io
from urllib.parse import urlparse

import httpx
from loguru import logger
from app.utils.ssrf import validate_final_url


PDF_MAX_SIZE = 50 * 1024 * 1024


class PdfResult:
    def __init__(self, url: str, title: str, text: str, page_count: int, index_key: str = ""):
        self.url = url
        self.title = title
        self.text = text
        self.page_count = page_count
        self.index_key = index_key


def content_to_index_key(content: bytes) -> str:
    return "pdf_" + hashlib.sha256(content).hexdigest()[:16]


def url_to_index_key(url: str) -> str:
    return "pdf_" + hashlib.md5(url.encode()).hexdigest()[:16]


def _extract_pdf(content: bytes, source_label: str) -> PdfResult:
    """Extract text from raw PDF bytes. Shared by URL fetch and file upload paths."""
    if len(content) > PDF_MAX_SIZE:
        raise ValueError(f"PDF exceeds size limit of {PDF_MAX_SIZE // (1024 * 1024)}MB.")

    import fitz
    doc = fitz.open(stream=content, filetype="pdf")
    page_count = doc.page_count

    pages: list[str] = []
    title = ""
    for i, page in enumerate(doc):
        text = page.get_text().strip()
        if text:
            pages.append(text)
        if i == 0 and not title:
            title = text.split("\n")[0][:200]

    doc.close()

    full_text = "\n\n".join(pages)
    if len(full_text) < 50:
        raise ValueError("Could not extract meaningful text from this PDF.")

    title = title or source_label or "Untitled PDF"
    index_key = content_to_index_key(content)

    return PdfResult(url=source_label if source_label.startswith("http") else "", title=title, text=full_text, page_count=page_count, index_key=index_key)


async def fetch_pdf(url: str) -> PdfResult:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are supported.")
    if not parsed.hostname:
        raise ValueError("Invalid URL: no hostname.")

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0), follow_redirects=True) as client:
        resp = await client.get(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; KnowledgeOS/1.0; +https://knowledgeos.app)",
            },
        )
        resp.raise_for_status()
        validate_final_url(str(resp.url))

    content = resp.content

    content_type = resp.headers.get("content-type", "")
    if "pdf" not in content_type and not url.lower().endswith(".pdf"):
        logger.warning("URL may not be a PDF (content-type: {}, extension: {})", content_type, url)

    result = _extract_pdf(content, url)
    result.url = url
    return result


def process_pdf_bytes(file_bytes: bytes, filename: str = "") -> PdfResult:
    """Process a PDF from raw file bytes (file upload)."""
    source_label = filename or "Untitled PDF"
    name_without_ext = source_label.rsplit(".", 1)[0] if "." in source_label else source_label
    result = _extract_pdf(file_bytes, name_without_ext)
    return result
