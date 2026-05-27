import sentry_sdk
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import config
from app.routes import health, transcript, chat, export
from app.services import embedding_service
from app.utils import session_cache

# Initialize Sentry
sentry_sdk.init(
    dsn="",  # Add your Sentry DSN here
    environment=config["node_env"],
    traces_sample_rate=1.0,
)

async def _cleanup_loop(stop_event: asyncio.Event) -> None:
    interval_s = int(config.get("cleanup_interval_s", 600))
    max_age_s = int(config.get("vector_index_ttl_s", config.get("session_cache_ttl", 7200)))

    while not stop_event.is_set():
        try:
            active_ids = set(session_cache.session_cache.keys())
            removed = embedding_service.cleanup_orphaned_indexes(active_ids, max_age_s=max_age_s)
            if removed and config.get("node_env") != "production":
                print(f"🧹 Cleanup removed {removed} orphaned vector index dirs")
        except Exception as e:
            print(f"Cleanup loop error: {e}")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval_s)
        except asyncio.TimeoutError:
            continue


@asynccontextmanager
async def lifespan(app: FastAPI):
    stop_event = asyncio.Event()
    task = asyncio.create_task(_cleanup_loop(stop_event))
    try:
        yield
    finally:
        stop_event.set()
        try:
            await asyncio.wait_for(task, timeout=5)
        except Exception:
            task.cancel()


app = FastAPI(title="YouTube AI Chat Agent", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config["cors_origins"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "RATE_LIMITED",
            "message": "Too many requests. Please wait a minute and try again.",
        },
    )


# Include routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(transcript.router, prefix="/api/transcript", tags=["transcript"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(export.router, prefix="/api/export", tags=["export"])


# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
        },
    )


if __name__ == "__main__":
    import uvicorn

    print(f"🚀 Server running on port {config['port']} ({config['node_env']})")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=config["port"],
        reload=config["node_env"] == "development",
    )
