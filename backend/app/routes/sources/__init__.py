from fastapi import APIRouter

from app.routes.sources.youtube import router as youtube_router
from app.routes.sources.website import router as website_router
from app.routes.sources.pdf import router as pdf_router
from app.routes.sources.markdown import router as markdown_router
from app.routes.sources.text import router as text_router
from app.routes.sources.docx import router as docx_router
from app.routes.sources.pptx import router as pptx_router
from app.routes.sources.github import router as github_router
from app.routes.sources.upload import router as upload_router

sources_router = APIRouter()

sources_router.include_router(youtube_router, prefix="/youtube", tags=["sources/youtube"])
sources_router.include_router(website_router, prefix="/website", tags=["sources/website"])
sources_router.include_router(pdf_router, prefix="/pdf", tags=["sources/pdf"])
sources_router.include_router(markdown_router, prefix="/markdown", tags=["sources/markdown"])
sources_router.include_router(text_router, prefix="/text", tags=["sources/text"])
sources_router.include_router(docx_router, prefix="/docx", tags=["sources/docx"])
sources_router.include_router(pptx_router, prefix="/pptx", tags=["sources/pptx"])
sources_router.include_router(github_router, prefix="/github", tags=["sources/github"])
sources_router.include_router(upload_router, prefix="/upload", tags=["sources/upload"])
