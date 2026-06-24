from fastapi import APIRouter

from app.routes.ai.chat import router as chat_router
from app.routes.ai.summary import router as summary_router
from app.routes.ai.notes import router as notes_router
from app.routes.ai.search import router as search_router
from app.routes.ai.actions import router as actions_router
from app.routes.ai.flashcards import router as flashcards_router
from app.routes.ai.quiz import router as quiz_router
from app.routes.ai.learning_path import router as learning_path_router
from app.routes.ai.daily_revision import router as daily_revision_router
from app.routes.ai.progress import router as progress_router

ai_router = APIRouter()

ai_router.include_router(chat_router, prefix="/chat", tags=["ai/chat"])
ai_router.include_router(summary_router, prefix="/summary", tags=["ai/summary"])
ai_router.include_router(notes_router, prefix="/notes", tags=["ai/notes"])
ai_router.include_router(search_router, prefix="/search", tags=["ai/search"])
ai_router.include_router(actions_router, prefix="/actions", tags=["ai/actions"])
ai_router.include_router(flashcards_router, prefix="/flashcards", tags=["ai/flashcards"])
ai_router.include_router(quiz_router, prefix="/quiz", tags=["ai/quiz"])
ai_router.include_router(learning_path_router, prefix="/learning-path", tags=["ai/learning-path"])
ai_router.include_router(daily_revision_router, prefix="/daily-revision", tags=["ai/daily-revision"])
ai_router.include_router(progress_router, prefix="/progress", tags=["ai/progress"])
