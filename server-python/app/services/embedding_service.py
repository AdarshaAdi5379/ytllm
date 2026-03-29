import os
import tempfile
import google.generativeai as genai
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import config
from app.utils.chunk_text import chunk_text
from app.utils.retry import retry, sleep

genai.configure(api_key=config["google_api_key"])

# In-memory map of video_id -> chromadb client
vector_indexes = {}


def get_index_path(video_id: str) -> str:
    """Get the path for storing the vector index."""
    return os.path.join(tempfile.gettempdir(), "ytllm-vectors", video_id)


async def get_or_create_index(video_id: str):
    """Get or create a ChromaDB index for a video."""
    if video_id in vector_indexes:
        return vector_indexes[video_id]

    index_path = get_index_path(video_id)
    os.makedirs(index_path, exist_ok=True)

    client = chromadb.PersistentClient(path=index_path)
    collection = client.get_or_create_collection(
        name=f"video_{video_id}", metadata={"hnsw:space": "cosine"}
    )
    vector_indexes[video_id] = collection
    return collection


async def embed_text(text: str) -> list[float]:
    """Embeds a single text using gemini-embedding-001."""

    async def _embed():
        result = genai.embed_content(
            model="gemini-embedding-001",
            content=text,
        )
        return result["embedding"]

    return await retry(_embed, max_attempts=3)


async def index_transcript(video_id: str, transcript: str) -> int:
    """Indexes transcript chunks for a video."""
    chunks = chunk_text(transcript, config["chunk_size"], config["chunk_overlap"])
    print(f"Indexing {len(chunks)} chunks for video {video_id}")

    # Clear existing index
    if video_id in vector_indexes:
        del vector_indexes[video_id]

    collection = await get_or_create_index(video_id)

    # Process in batches
    for i in range(0, len(chunks), config["embedding_batch_size"]):
        batch = chunks[i : i + config["embedding_batch_size"]]

        for j, chunk in enumerate(batch):
            chunk_index = i + j
            embedding = await embed_text(chunk)

            collection.upsert(
                ids=[str(chunk_index)],
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[{"chunk_index": chunk_index}],
            )

        # Delay between batches
        if i + config["embedding_batch_size"] < len(chunks):
            await sleep(int(config["embedding_batch_delay"] * 1000))

    print(f"Indexed {len(chunks)} chunks for video {video_id}")
    return len(chunks)


async def retrieve_relevant_chunks(
    video_id: str, query: str, top_k: int = None
) -> list[str]:
    """Retrieves the top-k most semantically similar chunks for a query."""
    if video_id not in vector_indexes:
        print(f"No vector index found for video {video_id}")
        return []

    if top_k is None:
        top_k = config["top_k_chunks"]

    collection = vector_indexes[video_id]

    query_embedding = await embed_text(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )

    documents = results.get("documents", [[]])[0]
    return documents


def delete_index(video_id: str) -> None:
    """Deletes the vector index for a video (cleanup)."""
    if video_id in vector_indexes:
        del vector_indexes[video_id]
