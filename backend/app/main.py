import sentry_sdk
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import config
from app.database import init_db
from app.middleware.error_handler import register_error_handlers
from app.middleware.rate_limit import limiter
from app.routes import health, transcript, chat, export, auth, videos
from app.routes import workspace_router, sources_router, ai_router, tasks_router, standalone_router
from app.routes import feedback as feedback_router
from app.utils.logging import setup_logging

MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB

# Initialize Sentry (only if DSN is configured)
if config.get("sentry_dsn"):
    sentry_sdk.init(
        dsn=config["sentry_dsn"],
        environment=config["node_env"],
        traces_sample_rate=0.1,
    )

# Chroma vector indexes live in Chroma Cloud (server-side). Explicit collection
# deletion happens on source deletion; there is no local filesystem to GC.
# (The legacy _cleanup_loop that scanned local index dirs was removed.)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting Scritur (env={})", config["node_env"])
    await init_db()
    yield


app = FastAPI(title="Scritur", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config["cors_origins"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Guest-Token"],
)

# Rate limiting
app.state.limiter = limiter
# SlowAPIMiddleware enforces the limiter's default_limits on every route
# (including guest-accessible endpoints) without needing per-route decorators.
app.add_middleware(SlowAPIMiddleware)

# Request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    auth_header = request.headers.get("Authorization", "")
    auth_label = "Bearer" if auth_header.startswith("Bearer") else "none"
    logger.info("REQUEST {} {} auth={}", request.method, request.url.path, auth_label)
    response = await call_next(request)
    logger.info("RESPONSE {} {} status={}", request.method, request.url.path, response.status_code)
    return response

# Security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Request body size limit
@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("Content-Length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(
            status_code=413,
            content={"error": "PAYLOAD_TOO_LARGE", "message": "Request body too large."},
        )
    return await call_next(request)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "RATE_LIMITED",
            "message": "Too many requests. Please wait a minute and try again.",
        },
    )


# V1 domain routers
app.include_router(workspace_router, prefix="/api/workspace", tags=["workspace"])
app.include_router(sources_router, prefix="/api/sources", tags=["sources"])
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
app.include_router(standalone_router, prefix="/api/standalone", tags=["standalone"])
app.include_router(feedback_router.router, prefix="/api/feedback", tags=["feedback"])

# Shared / standalone routers
# Note: old routes/transcript.py and routes/chat.py still registered below for V0 backward compat
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(transcript.router, prefix="/api/transcript", tags=["transcript"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])

# Register error handlers (must be after routers)
register_error_handlers(app)


if __name__ == "__main__":
    import uvicorn

    setup_logging()
    logger.info("Scritur starting on port {} ({})", config["port"], config["node_env"])
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=config["port"],
        reload=config["node_env"] == "development",
    )
