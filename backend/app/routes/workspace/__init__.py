from fastapi import APIRouter

from app.routes.workspace.workspaces import router as workspaces_router
from app.routes.workspace.folders import router as folders_router
from app.routes.workspace.sources import router as sources_router
from app.routes.workspace.search import router as search_router

workspace_router = APIRouter()

workspace_router.include_router(workspaces_router, prefix="", tags=["workspace"])
workspace_router.include_router(folders_router, prefix="/{workspace_id}/folders", tags=["workspace/folders"])
workspace_router.include_router(sources_router, prefix="/{workspace_id}/sources", tags=["workspace/sources"])
workspace_router.include_router(search_router, prefix="/{workspace_id}/search", tags=["workspace/search"])
