from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import User
from app.models import (
    AdminJobPostingResponse,
    JobPostingCreate,
    JobPostingUpdate,
    JobStatusUpdate,
    JobApplicationResponse,
    JobApplicationStatusUpdate,
)
from app.services.auth_service import require_admin_user
from app.services import careers_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Job Postings Management
# ---------------------------------------------------------------------------

@router.get("/jobs", response_model=list[AdminJobPostingResponse])
async def list_jobs(
    status: str | None = Query(None),
    department: str | None = Query(None),
    search: str | None = Query(None),
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all jobs with status and application counts."""
    return await careers_service.list_admin_jobs(
        db=db,
        status_filter=status,
        department=department,
        search=search,
    )


@router.post("/jobs", response_model=AdminJobPostingResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    data: JobPostingCreate,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new job posting."""
    return await careers_service.create_job(db=db, data=data)


@router.get("/jobs/{job_id}", response_model=AdminJobPostingResponse)
async def get_job(
    job_id: str,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single job details for admin."""
    return await careers_service.get_admin_job_by_id(db=db, job_id=job_id)


@router.put("/jobs/{job_id}", response_model=AdminJobPostingResponse)
async def update_job(
    job_id: str,
    data: JobPostingUpdate,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update job posting details."""
    return await careers_service.update_job(db=db, job_id=job_id, data=data)


@router.patch("/jobs/{job_id}/status", response_model=AdminJobPostingResponse)
async def update_job_status(
    job_id: str,
    status_update: JobStatusUpdate,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update job publication status (draft/published/closed)."""
    return await careers_service.update_job_status(db=db, job_id=job_id, new_status=status_update.status)


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete job posting and all its candidate applications."""
    return await careers_service.delete_job(db=db, job_id=job_id)


# ---------------------------------------------------------------------------
# Applications Management
# ---------------------------------------------------------------------------

@router.get("/applications", response_model=list[JobApplicationResponse])
async def list_applications(
    job_id: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List candidate applications with filters."""
    return await careers_service.list_admin_applications(
        db=db,
        job_id=job_id,
        status_filter=status,
        search=search,
    )


@router.get("/applications/{app_id}", response_model=JobApplicationResponse)
async def get_application(
    app_id: str,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single application details."""
    return await careers_service.get_admin_application_by_id(db=db, app_id=app_id)


@router.patch("/applications/{app_id}/status", response_model=JobApplicationResponse)
async def update_application_status(
    app_id: str,
    status_update: JobApplicationStatusUpdate,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update status of a candidate application."""
    return await careers_service.update_application_status(
        db=db,
        app_id=app_id,
        new_status=status_update.status,
    )


@router.get("/applications/{app_id}/resume")
async def download_resume(
    app_id: str,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Download candidate resume file."""
    file_path, filename = await careers_service.get_application_resume_file(db=db, app_id=app_id)
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream",
    )
