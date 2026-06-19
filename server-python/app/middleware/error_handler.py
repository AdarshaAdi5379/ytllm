import uuid
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from loguru import logger

from app.config import config


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: dict | None = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


def _make_error_response(code: str, message: str, status_code: int = 500, details: dict | None = None):
    return JSONResponse(
        status_code=status_code,
        content={
            "error": code,
            "message": message,
            "error_id": uuid.uuid4().hex[:16],
            **(details or {}),
        },
    )


def register_error_handlers(app: FastAPI):
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        logger.warning("AppError {} on {} {}: {}", exc.code, request.method, request.url.path, exc.message)
        return _make_error_response(exc.code, exc.message, exc.status_code, exc.details)

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        error_id = uuid.uuid4().hex[:16]
        logger.exception("Unhandled error [{}] on {} {}: {}", error_id, request.method, request.url.path, exc)

        response = _make_error_response(
            "INTERNAL_ERROR",
            "An unexpected error occurred. Please try again.",
            status_code=500,
        )

        if config.get("node_env") == "development":
            body = response.body.decode() if isinstance(response.body, bytes) else str(response.body)
            import json
            try:
                body_dict = json.loads(body)
            except (json.JSONDecodeError, TypeError):
                body_dict = {"error": "INTERNAL_ERROR", "message": str(exc), "error_id": error_id}
            body_dict["trace"] = traceback.format_exc()
            return JSONResponse(status_code=500, content=body_dict)

        return response
