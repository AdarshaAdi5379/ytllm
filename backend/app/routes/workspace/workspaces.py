from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.db_models import User, Workspace, WorkspaceMember
from app.models import (
    WorkspaceResponse, CreateWorkspaceRequest, UpdateWorkspaceRequest,
)
from app.services.auth_service import get_current_user, require_workspace_role, ADMIN_ROLES, WRITE_ROLES

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
    # Workspaces where user is owner OR member
    owned = await db.execute(
        select(Workspace).where(Workspace.owner_id == user.id).order_by(Workspace.created_at)
    )
    owned_ids = {ws.id for ws in owned.scalars().all()}

    member_result = await db.execute(
        select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == user.id)
    )
    member_ids = {row[0] for row in member_result.fetchall() if row[0] not in owned_ids}

    all_ws = []
    if owned_ids:
        owned_result = await db.execute(
            select(Workspace).where(Workspace.id.in_(owned_ids)).order_by(Workspace.created_at)
        )
        all_ws.extend(owned_result.scalars().all())
    if member_ids:
        member_result = await db.execute(
            select(Workspace).where(Workspace.id.in_(member_ids)).order_by(Workspace.created_at)
        )
        all_ws.extend(member_result.scalars().all())

    return [_ws_to_response(ws) for ws in all_ws]


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
    await require_workspace_role(db, workspace_id, user.id)
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
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
    await require_workspace_role(db, workspace_id, user.id, ADMIN_ROLES)
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
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
    await require_workspace_role(db, workspace_id, user.id, ("owner",))
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})
    await db.delete(ws)
    await db.commit()
    return {"status": "deleted"}
