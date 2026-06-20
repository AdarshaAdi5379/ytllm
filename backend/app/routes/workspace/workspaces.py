from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.db_models import User, Workspace
from app.models import (
    WorkspaceResponse, CreateWorkspaceRequest, UpdateWorkspaceRequest,
)
from app.services.auth_service import get_current_user

router = APIRouter()


def _ws_to_response(ws: Workspace) -> WorkspaceResponse:
    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        created_at=ws.created_at.isoformat() if ws.created_at else "",
        updated_at=ws.updated_at.isoformat() if ws.updated_at else "",
    )


@router.get("/", response_model=list[WorkspaceResponse])
async def list_workspaces(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace)
        .where(Workspace.owner_id == user.id)
        .order_by(Workspace.created_at)
    )
    return [_ws_to_response(ws) for ws in result.scalars().all()]


@router.post("/", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    req: CreateWorkspaceRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = Workspace(name=req.name.strip() or "My Workspace", owner_id=user.id)
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    return _ws_to_response(ws)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id, Workspace.owner_id == user.id
        )
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})
    return _ws_to_response(ws)


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    req: UpdateWorkspaceRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id, Workspace.owner_id == user.id
        )
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})
    ws.name = req.name.strip()
    await db.commit()
    await db.refresh(ws)
    return _ws_to_response(ws)


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id, Workspace.owner_id == user.id
        )
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})
    await db.delete(ws)
    await db.commit()
    return {"status": "deleted"}
