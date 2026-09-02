from fastapi import APIRouter
from datetime import datetime

from app.services.embedding_service import check_chroma_connectivity


router = APIRouter()


@router.get("/")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/chroma")
async def chroma_health_check():
    """Safe Chroma connectivity check (no side effects on app data).

    Creates and deletes a throwaway `__connectivity_test__` collection.
    """
    return check_chroma_connectivity()
