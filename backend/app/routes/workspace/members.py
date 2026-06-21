from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import User, Workspace, WorkspaceMember
from app.services.auth_service import get_current_user, require_workspace_role, ADMIN_ROLES


router = APIRouter()


class InviteMemberRequest(BaseModel):
    email: str
    role: str = "editor"


class UpdateMemberRequest(BaseModel):
    role: str


class MemberResponse(BaseModel):
    id: str
    user_id: str
    email: str
    role: str
    created_at: str


@router.post("/", response_model=MemberResponse, status_code=201)
async def invite_member(
    workspace_id: str,
    req: InviteMemberRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_workspace_role(db, workspace_id, user.id, ADMIN_ROLES)

    if req.role not in ("admin", "editor", "viewer"):
        raise HTTPException(status_code=422, detail={"error": "INVALID_ROLE", "message": "Role must be admin, editor, or viewer."})

    target = await db.execute(select(User).where(User.email == req.email))
    target_user = target.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail={"error": "USER_NOT_FOUND", "message": "No user found with that email."})

    if target_user.id == user.id:
        raise HTTPException(status_code=422, detail={"error": "SELF_INVITE", "message": "Cannot invite yourself."})

    existing = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == target_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={"error": "ALREADY_MEMBER", "message": "User is already a member."})

    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=target_user.id,
        role=req.role,
        invited_by=user.id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        email=target_user.email,
        role=member.role,
        created_at=member.created_at.isoformat() if member.created_at else "",
    )


@router.get("/", response_model=list[MemberResponse])
async def list_members(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_workspace_role(db, workspace_id, user.id)

    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Workspace not found."})
    owner_result = await db.execute(select(User).where(User.id == ws.owner_id))
    owner_user = owner_result.scalar_one_or_none()

    members_list: list[MemberResponse] = []
    if owner_user:
        members_list.append(MemberResponse(
            id="owner",
            user_id=owner_user.id,
            email=owner_user.email,
            role="owner",
            created_at=ws.created_at.isoformat() if ws.created_at else "",
        ))

    member_result = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id)
    )
    for m in member_result.scalars().all():
        u_result = await db.execute(select(User).where(User.id == m.user_id))
        u = u_result.scalar_one_or_none()
        members_list.append(MemberResponse(
            id=m.id,
            user_id=m.user_id,
            email=u.email if u else "unknown",
            role=m.role,
            created_at=m.created_at.isoformat() if m.created_at else "",
        ))

    return members_list


@router.patch("/{member_id}")
async def update_member_role(
    workspace_id: str,
    member_id: str,
    req: UpdateMemberRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_workspace_role(db, workspace_id, user.id, ADMIN_ROLES)

    if req.role not in ("admin", "editor", "viewer"):
        raise HTTPException(status_code=422, detail={"error": "INVALID_ROLE", "message": "Role must be admin, editor, or viewer."})

    member_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.id == member_id,
            WorkspaceMember.workspace_id == workspace_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Member not found."})

    member.role = req.role
    await db.commit()
    return {"status": "updated"}


@router.delete("/{member_id}")
async def remove_member(
    workspace_id: str,
    member_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_workspace_role(db, workspace_id, user.id, ADMIN_ROLES)

    member_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.id == member_id,
            WorkspaceMember.workspace_id == workspace_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Member not found."})

    await db.delete(member)
    await db.commit()
    return {"status": "removed"}
