from fastapi import APIRouter

from app.routes.sources.youtube import router as youtube_router

sources_router = APIRouter()

sources_router.include_router(youtube_router, prefix="/youtube", tags=["sources/youtube"])
