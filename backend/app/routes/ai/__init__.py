from fastapi import APIRouter

from app.routes.ai.chat import router as chat_router
from app.routes.ai.summary import router as summary_router
from app.routes.ai.notes import router as notes_router
from app.routes.ai.search import router as search_router

ai_router = APIRouter()

ai_router.include_router(chat_router, prefix="/chat", tags=["ai/chat"])
ai_router.include_router(summary_router, prefix="/summary", tags=["ai/summary"])
ai_router.include_router(notes_router, prefix="/notes", tags=["ai/notes"])
ai_router.include_router(search_router, prefix="/search", tags=["ai/search"])
