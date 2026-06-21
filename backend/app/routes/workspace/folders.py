from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.db_models import User, Folder, Source
from app.models import (
    FolderResponse, CreateFolderRequest, UpdateFolderRequest, FolderTreeItem,
)
from app.services.auth_service import get_current_user, verify_workspace_access

router = APIRouter()


def _folder_to_response(f: Folder) -> FolderResponse:
    return FolderResponse(
        id=f.id,
        workspace_id=f.workspace_id,
        name=f.name,
        parent_id=f.parent_id,
        sort_order=f.sort_order,
        created_at=f.created_at.isoformat() if f.created_at else "",
        updated_at=f.updated_at.isoformat() if f.updated_at else "",
    )


async def _build_folder_tree(
    db: AsyncSession,
    workspace_id: str,
    parent_id: str | None = None,
) -> list[FolderTreeItem]:
    """Recursively build a folder tree for a workspace."""
    result = await db.execute(
        select(Folder)
        .where(
            Folder.workspace_id == workspace_id,
            Folder.parent_id == parent_id,
        )
        .order_by(Folder.sort_order, Folder.name)
    )
    folders = result.scalars().all()
    items = []
    for f in folders:
        children = await _build_folder_tree(db, workspace_id, f.id)
        count_result = await db.execute(
            select(func.count(Source.id)).where(Source.folder_id == f.id)
        )
        source_count = int(count_result.scalar() or 0)
        items.append(FolderTreeItem(
            id=f.id,
            name=f.name,
            parent_id=f.parent_id,
            sort_order=f.sort_order,
            children=children,
            source_count=source_count + sum(c.source_count for c in children),
        ))
    return items


@router.get("/", response_model=list[FolderTreeItem])
async def list_folders(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List folders as a tree for the given workspace."""
    return await _build_folder_tree(db, workspace_id)


@router.get("/flat", response_model=list[FolderResponse])
async def list_folders_flat(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List folders as a flat list for the given workspace."""
    result = await db.execute(
        select(Folder)
        .where(Folder.workspace_id == workspace_id)
        .order_by(Folder.sort_order, Folder.name)
    )
    return [_folder_to_response(f) for f in result.scalars().all()]


@router.post("/", response_model=FolderResponse, status_code=201)
async def create_folder(
    workspace_id: str,
    req: CreateFolderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(db, workspace_id, user.id)

    # If parent_id is given, verify it exists in this workspace
    if req.parent_id:
        parent_result = await db.execute(
        select(Folder).where(
                Folder.id == req.parent_id, Folder.workspace_id == workspace_id
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=422, detail={"error": "INVALID_PARENT", "message": "Parent folder not found."})

    # Get max sort_order for the parent level
    max_order_result = await db.execute(
        select(func.max(Folder.sort_order)).where(
            Folder.workspace_id == workspace_id,
            Folder.parent_id == req.parent_id,
        )
    )
    max_order = max_order_result.scalar() or 0

    folder = Folder(
        workspace_id=workspace_id,
        name=req.name.strip(),
        parent_id=req.parent_id,
        sort_order=max_order + 1,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return _folder_to_response(folder)


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    workspace_id: str,
    folder_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder).where(
            Folder.id == folder_id, Folder.workspace_id == workspace_id
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Folder not found."})
    return _folder_to_response(f)


@router.patch("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    workspace_id: str,
    folder_id: str,
    req: UpdateFolderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder).where(
            Folder.id == folder_id, Folder.workspace_id == workspace_id
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Folder not found."})

    if req.name is not None:
        f.name = req.name.strip()
    if req.sort_order is not None:
        f.sort_order = req.sort_order
    if req.parent_id is not None:
        # Verify new parent exists in this workspace
        parent_result = await db.execute(
            select(Folder).where(
                Folder.id == req.parent_id, Folder.workspace_id == workspace_id
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=422, detail={"error": "INVALID_PARENT", "message": "Parent folder not found."})
        f.parent_id = req.parent_id

    await db.commit()
    await db.refresh(f)
    return _folder_to_response(f)


@router.delete("/{folder_id}")
async def delete_folder(
    workspace_id: str,
    folder_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder).where(
            Folder.id == folder_id, Folder.workspace_id == workspace_id
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Folder not found."})
    await db.delete(f)
    await db.commit()
    return {"status": "deleted"}
