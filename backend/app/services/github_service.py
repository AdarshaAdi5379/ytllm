import asyncio
import hashlib
import os
import re
import shutil
import tempfile
import uuid
from urllib.parse import urlparse

import httpx
from loguru import logger

from app.utils.ssrf import validate_final_url
from app.services.code_chunker import CodeChunk, chunk_code_file, detect_language

CLONE_MAX_SIZE = 100 * 1024 * 1024  # 100MB for clone mode
API_MAX_SIZE = 10 * 1024 * 1024  # 10MB for API mode
CLONE_FILE_THRESHOLD = 200  # switch to clone if more files than this

EXCLUDED_PATTERNS = re.compile(
    r"(node_modules|\.git|__pycache__|\.venv|venv|dist|build|\.next|target|vendor|"
    r"\.tox|\.eggs|\.gradle|\.idea|\.vscode|migrations|__pycache__)"
)
EXCLUDED_EXTENSIONS = frozenset({
    ".min.js", ".bundle.js", ".min.css",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".class",
    ".pyc", ".pyo", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".eot", ".ttf",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
    ".mp3", ".mp4", ".avi", ".mov", ".wav", ".flac",
    ".lock", ".log",
})
INCLUDED_EXTENSIONS = frozenset({
    ".py", ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs",
    ".go", ".rs", ".java", ".c", ".cpp", ".h", ".hpp", ".hxx", ".cxx",
    ".rb", ".php", ".swift", ".kt", ".scala", ".clj", ".cljs",
    ".md", ".rst", ".txt",
    ".json", ".yaml", ".yml", ".toml", ".cfg", ".ini", ".conf",
    ".sh", ".bash", ".zsh", ".fish",
    ".sql", ".css", ".scss", ".less", ".html", ".vue", ".svelte",
    ".xml", ".graphql", ".proto",
    ".dockerfile", ".makefile",
    ".gradle", ".properties",
    ".env.example", ".gitignore", ".gitattributes",
    ".editorconfig",
})


class RepoFile:
    def __init__(self, path: str, content: str):
        self.path = path
        self.content = content


class RepoResult:
    def __init__(
        self,
        owner: str,
        repo: str,
        branch: str,
        files: list[RepoFile],
        text: str,
        index_key: str,
        chunks: list[CodeChunk] | None = None,
    ):
        self.owner = owner
        self.repo = repo
        self.branch = branch
        self.files = files
        self.text = text
        self.index_key = index_key
        self.chunks = chunks or []


def _parse_github_url(url: str) -> tuple[str, str, str]:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are supported.")
    if parsed.hostname not in ("github.com", "www.github.com"):
        raise ValueError("Only github.com URLs are supported.")

    path = parsed.path.strip("/")
    parts = path.split("/")
    if len(parts) < 2:
        raise ValueError("Invalid GitHub URL. Expected: https://github.com/owner/repo")

    owner = parts[0]
    repo = parts[1].replace(".git", "")

    branch = "main"
    if len(parts) > 3 and parts[2] == "tree":
        branch = parts[3]
    elif len(parts) > 3 and parts[2] == "blob":
        branch = parts[3]

    return owner, repo, branch


def _should_include_dir(dir_path: str) -> bool:
    return not EXCLUDED_PATTERNS.search(dir_path)


def _build_result(
    owner: str,
    repo: str,
    branch: str,
    files: list[RepoFile],
    url: str,
) -> RepoResult:
    sections: list[str] = []
    for rf in files:
        sections.append(f"=== {rf.path} ===")
        sections.append(rf.content)
    combined_text = "\n\n".join(sections)

    all_chunks: list[CodeChunk] = []
    for rf in files:
        language = detect_language(rf.path)
        file_chunks = chunk_code_file(rf.content, rf.path, language)
        all_chunks.extend(file_chunks)

    index_key = url_to_index_key(url)
    return RepoResult(
        owner=owner,
        repo=repo,
        branch=branch,
        files=files,
        text=combined_text,
        index_key=index_key,
        chunks=all_chunks,
    )


def _should_include(path: str) -> bool:
    if EXCLUDED_PATTERNS.search(path):
        return False
    ext = "." + path.rsplit(".", 1)[-1].lower() if "." in path else ""
    if ext and ext not in INCLUDED_EXTENSIONS and ext not in EXCLUDED_EXTENSIONS:
        return False
    if ext in EXCLUDED_EXTENSIONS:
        return False
    basename = path.rsplit("/", 1)[-1].lower() if "/" in path else path.lower()
    if basename in ("package-lock.json", "yarn.lock", "gemfile.lock", "poetry.lock"):
        return False
    return True


def url_to_index_key(url: str) -> str:
    return "gh_" + hashlib.md5(url.encode()).hexdigest()[:16]


async def fetch_github_repo(url: str, token: str | None = None, mode: str = "auto") -> RepoResult:
    owner, repo, branch = _parse_github_url(url)

    if mode == "clone":
        return await fetch_github_repo_clone(url, token)

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "KnowledgeOS/1.0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    validate_final_url(api_url)

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        tree_resp = await client.get(api_url, headers=headers)
        if tree_resp.status_code == 403:
            if mode == "auto":
                logger.info("GitHub API rate limited, falling back to clone mode for {}", url)
                return await fetch_github_repo_clone(url, token)
            raise ValueError(
                "GitHub API rate limit reached. Provide a GITHUB_TOKEN for higher limits."
            )
        if tree_resp.status_code == 404:
            raise ValueError(f"Repository {owner}/{repo} not found.")
        tree_resp.raise_for_status()

        tree_data = tree_resp.json()
        items = tree_data.get("tree", [])

        file_paths = [
            item["path"]
            for item in items
            if item["type"] == "blob" and _should_include(item["path"])
        ]

        if mode == "auto" and len(file_paths) > CLONE_FILE_THRESHOLD:
            logger.info("Repository {} has {} files, switching to clone mode", url, len(file_paths))
            return await fetch_github_repo_clone(url, token)

        repo_files: list[RepoFile] = []
        total_size = 0

        for file_path in file_paths:
            if total_size > API_MAX_SIZE:
                logger.warning("GitHub API import: reached 10MB limit, stopping at {} files", len(repo_files))
                break

            content_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}?ref={branch}"
            try:
                content_resp = await client.get(content_url, headers=headers)
                if content_resp.status_code != 200:
                    continue
                content_data = content_resp.json()
                if not content_data.get("content"):
                    continue

                import base64
                decoded = base64.b64decode(content_data["content"]).decode("utf-8", errors="replace")
                repo_files.append(RepoFile(path=file_path, content=decoded))
                total_size += len(decoded)

            except Exception as e:
                logger.debug("Failed to fetch {}: {}", file_path, str(e))
                continue

    if not repo_files:
        raise ValueError("No source files found in the repository.")

    return _build_result(owner, repo, branch, repo_files, url)


async def fetch_github_repo_clone(url: str, token: str | None = None) -> RepoResult:
    owner, repo, branch = _parse_github_url(url)

    temp_dir = os.path.join(tempfile.gettempdir(), f"ytllm_github_{uuid.uuid4().hex[:12]}")
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _clone_and_read, url, temp_dir, branch, token)

        repo_files: list[RepoFile] = []
        total_size = 0

        for root, dirs, files in os.walk(temp_dir):
            rel_root = os.path.relpath(root, temp_dir)
            if rel_root != ".":
                dirs[:] = [d for d in dirs if _should_include_dir(os.path.join(rel_root, d))]
            else:
                dirs[:] = [d for d in dirs if _should_include_dir(d)]

            for file_name in files:
                file_path = os.path.join(root, file_name)
                rel_path = os.path.relpath(file_path, temp_dir)
                if not _should_include(rel_path):
                    continue
                try:
                    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read()
                    repo_files.append(RepoFile(path=rel_path, content=content))
                    total_size += len(content)
                    if total_size > CLONE_MAX_SIZE:
                        logger.warning("GitHub clone import: reached 100MB limit, stopping at {} files", len(repo_files))
                        break
                except Exception:
                    continue
            if total_size > CLONE_MAX_SIZE:
                break

        if not repo_files:
            raise ValueError("No source files found in the repository.")

        return _build_result(owner, repo, branch, repo_files, url)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def _clone_and_read(url: str, temp_dir: str, branch: str, token: str | None = None) -> None:
    from git import Repo as GitRepo, GitCommandError

    clone_url = url.rstrip("/")
    if not clone_url.endswith(".git"):
        clone_url += ".git"
    if token and "github.com" in url:
        clone_url = clone_url.replace("https://", f"https://x-access-token:{token}@")

    try:
        GitRepo.clone_from(clone_url, temp_dir, depth=1, branch=branch, single_branch=True)
    except GitCommandError as e:
        raise ValueError(f"Failed to clone repository: {e}")
