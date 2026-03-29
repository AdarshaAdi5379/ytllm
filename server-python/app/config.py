from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Literal


class Settings(BaseSettings):
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    gemini_model: str = Field(default="models/gemini-flash-latest", alias="GEMINI_MODEL")
    enable_gemini_enrichment: bool = Field(default=True, alias="ENABLE_GEMINI_ENRICHMENT")
    port: int = Field(default=3001, alias="PORT")
    node_env: Literal["development", "production", "test"] = Field(
        default="development", alias="NODE_ENV"
    )
    cors_origins: str = Field(default="http://localhost:5173,http://localhost:5174", alias="CORS_ORIGINS")

    # Memory settings
    chat_history_threshold: int = 10
    chat_window_size: int = 10
    max_tokens_in_window: int = 2000

    # Embedding settings
    chunk_size: int = 500
    chunk_overlap: int = 50
    top_k_chunks: int = 5
    embedding_batch_size: int = 20
    embedding_batch_delay: float = 0.5

    # Transcript acceptance (helps avoid partial/bad caption fetches)
    transcript_min_words: int = Field(default=100, alias="TRANSCRIPT_MIN_WORDS")

    # Cache settings
    session_cache_ttl: int = 7200  # 2 hours in seconds

    # Rate limits
    requests_per_minute: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True


try:
    settings = Settings()
except Exception as e:
    print(f"❌ Invalid environment variables: {e}")
    import sys

    sys.exit(1)


config = {
    "google_api_key": settings.google_api_key,
    "gemini_model": settings.gemini_model,
    "enable_gemini_enrichment": settings.enable_gemini_enrichment,
    "port": settings.port,
    "node_env": settings.node_env,
    "cors_origins": [origin.strip() for origin in settings.cors_origins.split(",")],
    "chat_history_threshold": settings.chat_history_threshold,
    "chat_window_size": settings.chat_window_size,
    "max_tokens_in_window": settings.max_tokens_in_window,
    "chunk_size": settings.chunk_size,
    "chunk_overlap": settings.chunk_overlap,
    "top_k_chunks": settings.top_k_chunks,
    "embedding_batch_size": settings.embedding_batch_size,
    "embedding_batch_delay": settings.embedding_batch_delay,
    "transcript_min_words": settings.transcript_min_words,
    "session_cache_ttl": settings.session_cache_ttl,
    "requests_per_minute": settings.requests_per_minute,
}
