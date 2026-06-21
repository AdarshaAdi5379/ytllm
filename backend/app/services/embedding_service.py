import os
import shutil
import time
from loguru import logger
from openai import AsyncOpenAI
import chromadb

from app.config import config
from app.utils.chunk_text import chunk_text
from app.utils.chunk_segments import TranscriptChunk, TranscriptSegment, chunk_segments
from app.utils.retry import retry, sleep

client = AsyncOpenAI(
    api_key=config["openai_api_key"],
    base_url=config.get("openai_base_url"),
)

# In-memory map of video_id -> chromadb client
vector_indexes = {}


def _vector_root() -> str:
    return config.get("vector_storage_path", "./data/vectors")


def get_index_path(video_id: str) -> str:
    """Get the path for storing the vector index."""
    return os.path.join(_vector_root(), video_id)


async def get_or_create_index(video_id: str):
    """Get or create a ChromaDB index for a video."""
    if video_id in vector_indexes:
        return vector_indexes[video_id]

    index_path = get_index_path(video_id)
    os.makedirs(index_path, exist_ok=True)

    _client = chromadb.PersistentClient(path=index_path)
    collection = _client.get_or_create_collection(
        name=f"video_{video_id}", metadata={"hnsw:space": "cosine"}
    )
    vector_indexes[video_id] = collection
    return collection


async def embed_text(text: str) -> list[float]:
    """Embeds a single text using OpenAI embeddings."""

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
                "distance": dist,
                "collection_key": key,
            })

    all_results.sort(key=lambda r: r.get("distance", 1.0))
    return all_results[:max_results]


def delete_index(video_id: str) -> None:
    """Deletes the vector index for a video (cleanup)."""
    if video_id in vector_indexes:
        del vector_indexes[video_id]


def delete_index_files(video_id: str) -> None:
    """Deletes on-disk vector index for a video."""
    index_path = get_index_path(video_id)
    if os.path.isdir(index_path):
        shutil.rmtree(index_path, ignore_errors=True)


def cleanup_orphaned_indexes(
    active_video_ids: set[str],
    max_age_s: int,
) -> int:
    root = _vector_root()
    if not os.path.isdir(root):
        return 0

    now = time.time()
    removed = 0
    for name in os.listdir(root):
        path = os.path.join(root, name)
        if not os.path.isdir(path):
            continue
        if name in active_video_ids:
            continue

        try:
            mtime = os.path.getmtime(path)
        except Exception:
            mtime = now

        if now - mtime >= max_age_s:
            shutil.rmtree(path, ignore_errors=True)
            removed += 1

    for vid in list(vector_indexes.keys()):
        if vid not in active_video_ids:
            del vector_indexes[vid]

    return removed


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
