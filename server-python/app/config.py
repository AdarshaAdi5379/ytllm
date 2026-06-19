from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Literal, Optional


class Settings(BaseSettings):
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    openai_embedding_model: str = Field(default="text-embedding-3-small", alias="OPENAI_EMBEDDING_MODEL")
    openai_base_url: Optional[str] = Field(default=None, alias="OPENAI_BASE_URL")
    enable_llm_enrichment: bool = Field(default=True, alias="ENABLE_LLM_ENRICHMENT")
    port: int = Field(default=3001, alias="PORT")
    node_env: Literal["development", "production", "test"] = Field(
        default="development", alias="NODE_ENV"
    )
    cors_origins: str = Field(default="http://localhost:5173,http://localhost:5174", alias="CORS_ORIGINS")
    sentry_dsn: str = Field(default="", alias="SENTRY_DSN")

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
    session_cache_ttl: int = Field(default=28800, alias="SESSION_CACHE_TTL")  # seconds (8 hours)
    cleanup_interval_s: int = Field(default=600, alias="CLEANUP_INTERVAL_S")  # seconds
    vector_index_ttl_s: int = Field(default=28800, alias="VECTOR_INDEX_TTL_S")  # seconds (8 hours)

    # Multi-video
    max_multi_videos: int = Field(default=10, alias="MAX_MULTI_VIDEOS")

    # Auth settings
    jwt_secret: str = Field(default="", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=10080, alias="JWT_EXPIRE_MINUTES")  # 7 days
    database_url: str = Field(default="sqlite+aiosqlite:///./ytllm.db", alias="DATABASE_URL")

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


# Validate required config
_required_in_prod = {
    "openai_api_key": "OPENAI_API_KEY",
    "jwt_secret": "JWT_SECRET",
}
if settings.node_env == "production":
    for val, name in _required_in_prod.items():
        if not getattr(settings, val, None):
            print(f"❌ {name} is required in production mode")
            import sys
            sys.exit(1)

config = {
    "openai_api_key": settings.openai_api_key,
    "openai_model": settings.openai_model,
    "openai_embedding_model": settings.openai_embedding_model,
    "openai_base_url": settings.openai_base_url,
    "enable_llm_enrichment": settings.enable_llm_enrichment,
    "port": settings.port,
    "node_env": settings.node_env,
    "cors_origins": [origin.strip() for origin in settings.cors_origins.split(",")],
    "sentry_dsn": settings.sentry_dsn,
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
    "cleanup_interval_s": settings.cleanup_interval_s,
    "vector_index_ttl_s": settings.vector_index_ttl_s,
    "max_multi_videos": settings.max_multi_videos,
    "jwt_secret": settings.jwt_secret,
    "jwt_algorithm": settings.jwt_algorithm,
    "jwt_expire_minutes": settings.jwt_expire_minutes,
    "database_url": settings.database_url,
    "requests_per_minute": settings.requests_per_minute,
}
