from fastapi import APIRouter

from app.routes.standalone.sessions import router as sessions_router
from app.routes.standalone.sources import router as sources_router
from app.routes.standalone.chat import router as chat_router
from app.routes.standalone.move import router as move_router
from app.routes.standalone.guest import router as guest_router

standalone_router = APIRouter()

standalone_router.include_router(sessions_router, prefix="/sessions", tags=["standalone/sessions"])
standalone_router.include_router(sources_router, prefix="/sessions", tags=["standalone/sources"])
standalone_router.include_router(chat_router, prefix="/sessions", tags=["standalone/chat"])
standalone_router.include_router(move_router, prefix="/sessions", tags=["standalone/move"])
standalone_router.include_router(guest_router, prefix="", tags=["standalone/guest"])
