from fastapi import APIRouter

from app.routes.sources.youtube import router as youtube_router
from app.routes.sources.website import router as website_router
from app.routes.sources.pdf import router as pdf_router

sources_router = APIRouter()

sources_router.include_router(youtube_router, prefix="/youtube", tags=["sources/youtube"])
sources_router.include_router(website_router, prefix="/website", tags=["sources/website"])
sources_router.include_router(pdf_router, prefix="/pdf", tags=["sources/pdf"])
