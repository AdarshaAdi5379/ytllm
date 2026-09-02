from loguru import logger
import time
from openai import AsyncOpenAI
import chromadb

from app.config import config
from app.utils.chunk_text import chunk_text
from app.utils.chunk_segments import TranscriptChunk, TranscriptSegment, chunk_segments
from app.utils.retry import retry, sleep
from app.services.code_chunker import CodeChunk

client = AsyncOpenAI(
    api_key=config["openai_api_key"],
    base_url=config.get("openai_base_url"),
)

# In-memory cache of index_key -> chromadb ClientAPI collection handle
vector_indexes = {}

# Lazily-initialized shared Chroma client (Cloud or HTTP).
_client = None


def _collection_name(index_key: str) -> str:
    """Collection names are server-side and globally namespaced by Chroma.

    Chroma Cloud requires unique collection names within the configured
    tenant/database. We keep the historical `video_` prefix for
    backward compatibility so existing collection names remain valid."
    """
    return f"video_{index_key}"


def resolve_chroma_client_type():
    """Return which Chroma backend is active based on env config.

    Selection is explicit and never silently falls back to local persistence:
      * CHROMA_API_KEY set  -> "cloud"   (chromadb.CloudClient)
      * CHROMA_HOST set     -> "http"    (chromadb.HttpClient to self-hosted server)
      * neither             -> raises RuntimeError on first use

    Returns:
        One of: "cloud", "http".
    Raises:
        RuntimeError: when neither CHROMA_API_KEY nor CHROMA_HOST is configured.
    """
    if config.get("chroma_api_key"):
        return "cloud"
    if config.get("chroma_host"):
        return "http"
    raise RuntimeError(
        "Chroma is not configured. Set CHROMA_API_KEY (Chroma Cloud) or "
        "CHROMA_HOST (self-hosted Chroma HTTP server). There is no "
        "local-filesystem persistence fallback — this is intentional so "
        "that deployments on ephemeral filesystems (e.g. Render) never "
        "silently lose vector data."
    )


def _new_client():
    """Build a fresh Chroma client (Cloud or HTTP). Never uses local persistence."""
    backend = resolve_chroma_client_type()
    tenant = config.get("chroma_tenant") or "default_tenant"
    database = config.get("chroma_database") or "default_database"
    if backend == "cloud":
        return chromadb.CloudClient(
            tenant=tenant,
            database=database,
            api_key=config["chroma_api_key"],
        )
    # backend == "http"
    return chromadb.HttpClient(
        host=config["chroma_host"],
        port=config.get("chroma_port", 8000),
        ssl=config.get("chroma_ssl", True),
        headers={"x-chroma-token": config["chroma_api_key"]} if config.get("chroma_api_key") else None,
        tenant=tenant,
        database=database,
    )


def _get_client():
    """Return the shared Chroma client (Chroma Cloud or HTTP server).

    Prefers Chroma Cloud (CHROMA_API_KEY). Falls back to a self-hosted Chroma
    server (CHROMA_HOST), e.g. the local docker-compose `chromadb` service.
    Uses NO local filesystem persistence so it is safe on Render's
    ephemeral disk.
    """
    global _client
    if _client is not None:
        return _client
    _client = _new_client()
    return _client


def reset_chroma_client():
    """Drop the cached Chroma client (mainly for tests)."""
    global _client
    _client = None


def check_chroma_connectivity() -> dict:
    """Safe, side-effect-free Chroma connectivity check.

    Verifies the configured Chroma backend (Cloud or HTTP) is reachable and
    usable WITHOUT touching any real application collections. It creates and
    deletes a short-lived throwaway collection named `chroma-connectivity-test`
    and heart-beats the server.

    Safe to run from a CLI or via the health endpoint GET /api/health/chroma.

    Returns:
        dict with keys: ok (bool), backend (str), tenant, database,
        error (str|None), and elapsed (float seconds).
    """

    start = time.monotonic()
    result = {
        "ok": False,
        "backend": None,
        "tenant": config.get("chroma_tenant") or "default_tenant",
        "database": config.get("chroma_database") or "default_database",
        "error": None,
        "elapsed": 0.0,
    }
    try:
        backend = resolve_chroma_client_type()
        result["backend"] = backend
        # Use a fresh client so we never mutate the shared cached `_client`.
        # NOTE: we intentionally do NOT call reset_chroma_client() — building a
        # new client leaves the app's shared client untouched.
        client_obj = _new_client()
        test_name = "chroma-connectivity-test"
        # create_collection raises if it already exists; delete first to be
        # idempotent, then create/get.
        try:
            client_obj.delete_collection(name=test_name)
        except Exception:
            pass
        client_obj.get_or_create_collection(name=test_name)
        # heartbeat confirms the server is actually answering.
        client_obj.heartbeat()
        result["ok"] = True
        # cleanup
        try:
            client_obj.delete_collection(name=test_name)
        except Exception:
            pass
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
    result["elapsed"] = round(time.monotonic() - start, 3)
    return result


async def get_or_create_index(video_id: str):
    """Get or create a Chroma collection for an index key (video/source)."""
    if video_id in vector_indexes:
        return vector_indexes[video_id]

    c = _collection_name(video_id)
    collection = _get_client().get_or_create_collection(
        name=c, metadata={"hnsw:space": "cosine"}
    )
    vector_indexes[video_id] = collection
    return collection


async def embed_text(text: str) -> list[float]:
    """Embeds a single text using OpenAI-compatible embeddings (works with OpenRouter)."""

    async def _embed():
        resp = await client.embeddings.create(
            model=config["openai_embedding_model"],
            input=text,
        )
        return resp.data[0].embedding

    return await retry(_embed, max_attempts=3)


async def index_transcript(video_id: str, transcript: str) -> int:
    """Indexes transcript chunks for a video."""
    chunks = chunk_text(transcript, config["chunk_size"], config["chunk_overlap"])
    chunk_objs: list[TranscriptChunk] = [
        TranscriptChunk(chunk_index=i, text=chunk, start_s=float(i), end_s=float(i))
        for i, chunk in enumerate(chunks)
    ]
    logger.info("Indexing {} chunks for video {}", len(chunk_objs), video_id)

    if video_id in vector_indexes:
        del vector_indexes[video_id]

    collection = await get_or_create_index(video_id)

    for i in range(0, len(chunk_objs), config["embedding_batch_size"]):
        batch = chunk_objs[i : i + config["embedding_batch_size"]]

        for j, chunk in enumerate(batch):
            chunk_index = i + j
            embedding = await embed_text(chunk.text)

            collection.upsert(
                ids=[str(chunk_index)],
                embeddings=[embedding],
                documents=[chunk.text],
                metadatas=[
                    {
                        "chunk_index": chunk_index,
                        "start_s": float(chunk.start_s),
                        "end_s": float(chunk.end_s),
                    }
                ],
            )

        if i + config["embedding_batch_size"] < len(chunks):
            await sleep(int(config["embedding_batch_delay"] * 1000))

    logger.info("Indexed {} chunks for video {}", len(chunk_objs), video_id)
    return len(chunk_objs)


async def index_code_chunks(index_key: str, chunks: list[CodeChunk]) -> int:
    """Indexes pre-chunked code with per-file metadata into ChromaDB."""
    logger.info("Indexing {} code chunks for {}", len(chunks), index_key)

    if index_key in vector_indexes:
        del vector_indexes[index_key]

    collection = await get_or_create_index(index_key)

    for i in range(0, len(chunks), config["embedding_batch_size"]):
        batch = chunks[i : i + config["embedding_batch_size"]]

        for j, chunk in enumerate(batch):
            chunk_index = i + j
            embedding = await embed_text(chunk.text)

            collection.upsert(
                ids=[str(chunk_index)],
                embeddings=[embedding],
                documents=[chunk.text],
                metadatas=[
                    {
                        "chunk_index": chunk_index,
                        "file_path": chunk.file_path,
                        "language": chunk.language,
                        "chunk_type": chunk.chunk_type,
                        "line_start": chunk.line_start,
                        "line_end": chunk.line_end,
                    }
                ],
            )

        if i + config["embedding_batch_size"] < len(chunks):
            await sleep(int(config["embedding_batch_delay"] * 1000))

    logger.info("Indexed {} code chunks for {}", len(chunks), index_key)
    return len(chunks)


async def index_transcript_segments(
    video_id: str, segments: list[TranscriptSegment], transcript_text: str
) -> int:
    """Indexes time-stamped transcript chunks for a video."""
    chunk_objs = chunk_segments(
        segments, config["chunk_size"], config["chunk_overlap"]
    )
    if not chunk_objs:
        return await index_transcript(video_id, transcript_text)

    logger.info("Indexing {} chunks for video {}", len(chunk_objs), video_id)

    if video_id in vector_indexes:
        del vector_indexes[video_id]

    collection = await get_or_create_index(video_id)

    for i in range(0, len(chunk_objs), config["embedding_batch_size"]):
        batch = chunk_objs[i : i + config["embedding_batch_size"]]

        for j, chunk in enumerate(batch):
            chunk_index = i + j
            embedding = await embed_text(chunk.text)

            collection.upsert(
                ids=[str(chunk_index)],
                embeddings=[embedding],
                documents=[chunk.text],
                metadatas=[
                    {
                        "chunk_index": int(chunk.chunk_index),
                        "start_s": float(chunk.start_s),
                        "end_s": float(chunk.end_s),
                    }
                ],
            )

        if i + config["embedding_batch_size"] < len(chunk_objs):
            await sleep(int(config["embedding_batch_delay"] * 1000))

    logger.info("Indexed {} chunks for video {}", len(chunk_objs), video_id)
    return len(chunk_objs)


async def retrieve_relevant_chunks(
    video_id: str,
    query: str,
    top_k: int = None,
    filters: dict | None = None,
) -> list[dict]:
    """Retrieves the top-k most semantically similar chunks for a query."""
    if top_k is None:
        top_k = config["top_k_chunks"]

    # Lazily (re)open the persistent Chroma collection if it isn't cached yet.
    collection = await get_or_create_index(video_id)

    query_embedding = await embed_text(query)

    where = _build_where_clause(filters)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas"],
    )

    documents = results.get("documents", [[]])[0] or []
    metadatas = results.get("metadatas", [[]])[0] or []
    out: list[dict] = []
    for doc, meta in zip(documents, metadatas):
        out.append(
            {
                "text": doc,
                "chunk_index": meta.get("chunk_index"),
                "start_s": meta.get("start_s"),
                "end_s": meta.get("end_s"),
                "file_path": meta.get("file_path"),
                "language": meta.get("language"),
                "chunk_type": meta.get("chunk_type"),
                "line_start": meta.get("line_start"),
                "line_end": meta.get("line_end"),
            }
        )
    return out


async def search_across_collections(
    collection_keys: list[str],
    query: str,
    top_k_per_source: int = 3,
    max_results: int = 20,
) -> list[dict]:
    """Search across multiple ChromaDB collections and return ranked results."""
    all_results: list[dict] = []

    for key in collection_keys:
        try:
            collection = await get_or_create_index(key)
        except Exception:
            continue

        query_embedding = await embed_text(query)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k_per_source,
            include=["documents", "metadatas", "distances"],
        )

        documents = results.get("documents", [[]])[0] or []
        metadatas = results.get("metadatas", [[]])[0] or []
        distances = results.get("distances", [[]])[0] or []

        for doc, meta, dist in zip(documents, metadatas, distances):
            all_results.append({
                "text": doc,
                "chunk_index": meta.get("chunk_index"),
                "start_s": meta.get("start_s"),
                "end_s": meta.get("end_s"),
                "file_path": meta.get("file_path"),
                "language": meta.get("language"),
                "chunk_type": meta.get("chunk_type"),
                "line_start": meta.get("line_start"),
                "line_end": meta.get("line_end"),
                "distance": dist,
                "collection_key": key,
            })

    all_results.sort(key=lambda r: r.get("distance", 1.0))
    return all_results[:max_results]


def delete_index(video_id: str) -> None:
    """Delete the Chroma collection for an index key."""
    if video_id in vector_indexes:
        del vector_indexes[video_id]
    _delete_collection(video_id)


def delete_chunks(index_key: str) -> None:
    """Delete the Chroma collection for a given key (standalone or workspace)."""
    if index_key in vector_indexes:
        del vector_indexes[index_key]
    _delete_collection(index_key)


def delete_index_files(video_id: str) -> None:
    """Backward-compatible no-op for legacy on-disk index cleanup.

    Previously removed the local index directory; index data now lives in a
    Chroma (Cloud) collection, which `delete_index`/`delete_chunks` remove.
    Kept so callers like workspace/sources.py (which call delete_index_files
    followed by delete_index) don't issue a redundant duplicate remote delete.
    """
    pass


def _delete_collection(index_key: str) -> None:
    """Delete a remote Chroma collection, tolerating a missing collection.

    Uses the cache name directly because non-existent index keys map to
    non-existent collections.
    """
    try:
        _get_client().delete_collection(name=_collection_name(index_key))
    except Exception:
        # Chroma raises NotFoundError for already-deleted collections and some
        # cloud backends raise for network blips. Deletion is best-effort:
        # source deletion in the DB is authoritative, vectors are derived.
        logger.debug("delete_collection failed (ignored) for {}", index_key)


def _build_where_clause(filters: dict | None) -> dict | None:
    if not filters:
        return None

    clauses: list[dict] = []

    time_range = filters.get("time_range_s") if isinstance(filters, dict) else None
    if (
        isinstance(time_range, (list, tuple))
        and len(time_range) == 2
        and time_range[0] is not None
        and time_range[1] is not None
    ):
        start_s = float(time_range[0])
        end_s = float(time_range[1])
        if end_s >= start_s:
            clauses.append({"start_s": {"$lte": end_s}})
            clauses.append({"end_s": {"$gte": start_s}})

    chunk_range = filters.get("chunk_index_range") if isinstance(filters, dict) else None
    if (
        isinstance(chunk_range, (list, tuple))
        and len(chunk_range) == 2
        and chunk_range[0] is not None
        and chunk_range[1] is not None
    ):
        start_i = int(chunk_range[0])
        end_i = int(chunk_range[1])
        if end_i >= start_i:
            clauses.append({"chunk_index": {"$gte": start_i}})
            clauses.append({"chunk_index": {"$lte": end_i}})

    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}
