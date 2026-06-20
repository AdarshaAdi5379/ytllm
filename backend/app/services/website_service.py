import hashlib
import re
from urllib.parse import urlparse

import httpx
from loguru import logger
from readability import Document as ReadabilityDoc
from app.utils.ssrf import validate_final_url


class WebPageResult:
    def __init__(self, url: str, title: str, text: str, site_name: str):
        self.url = url
        self.title = title
        self.text = text
        self.site_name = site_name


def url_to_index_key(url: str) -> str:
    return "site_" + hashlib.md5(url.encode()).hexdigest()[:16]


def _extract_site_name(url: str) -> str:
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    hostname = re.sub(r"^www\.", "", hostname)
    return hostname or "unknown"


async def fetch_webpage(url: str) -> WebPageResult:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are supported.")
    if not parsed.hostname:
        raise ValueError("Invalid URL: no hostname.")

    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0), follow_redirects=True) as client:
        resp = await client.get(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; KnowledgeOS/1.0; +https://knowledgeos.app)",
            },
        )
        resp.raise_for_status()
        validate_final_url(str(resp.url))

    html = resp.text
    doc = ReadabilityDoc(html)
    title = doc.title() or parsed.hostname
    content_html = doc.summary()

    text = _html_to_text(content_html)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    if len(text) < 50:
        raise ValueError("Could not extract meaningful content from this URL.")

    site_name = _extract_site_name(url)
    return WebPageResult(url=url, title=title, text=text, site_name=site_name)


def _html_to_text(html: str) -> str:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n")
