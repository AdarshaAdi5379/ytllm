import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db_models import JobPosting, JobApplication
from app.models import (
    JobPostingCreate,
    JobPostingUpdate,
    JobPostingResponse,
    AdminJobPostingResponse,
    JobApplicationCreate,
    JobApplicationResponse,
    JobApplicationPublicResponse,
)

BASE_SITE_URL = "https://www.scritur.space"
RESUMES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "resumes"


def _now() -> datetime:
    return datetime.utcnow()


def _ensure_resumes_dir() -> Path:
    RESUMES_DIR.mkdir(parents=True, exist_ok=True)
    return RESUMES_DIR


def generate_job_json_ld(job: JobPosting) -> dict:
    """Generate Schema.org JobPosting JSON-LD structured data."""
    emp_type_map = {
        "full_time": "FULL_TIME",
        "part_time": "PART_TIME",
        "contract": "CONTRACTOR",
        "internship": "INTERN",
    }
    employment_type_schema = emp_type_map.get(job.employment_type, "FULL_TIME")

    json_ld: dict = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": job.title,
        "description": job.description,
        "identifier": {
            "@type": "PropertyValue",
            "name": "Scritur",
            "value": job.slug,
        },
        "datePosted": (job.published_at or job.created_at).isoformat() if (job.published_at or job.created_at) else None,
        "employmentType": employment_type_schema,
        "hiringOrganization": {
            "@type": "Organization",
            "name": "Scritur",
            "sameAs": BASE_SITE_URL,
            "logo": f"{BASE_SITE_URL}/favicon.svg",
        },
        "jobLocation": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": job.location or "Remote",
                "addressCountry": "Global",
            },
        },
    }

    if job.workplace_type == "remote":
        json_ld["jobLocationType"] = "TELECOMMUTE"
        json_ld["applicantLocationRequirements"] = {
            "@type": "Country",
            "name": "Worldwide",
        }

    if job.expires_at:
        json_ld["validThrough"] = job.expires_at.isoformat()

    if job.compensation_amount:
        json_ld["baseSalary"] = {
            "@type": "MonetaryAmount",
            "currency": "USD",
            "value": {
                "@type": "QuantitativeValue",
                "value": job.compensation_amount,
                "unitText": "YEAR" if "year" in (job.compensation_amount or "").lower() else "MONTH",
            },
        }

    return json_ld


def _to_job_response(job: JobPosting, include_json_ld: bool = False) -> JobPostingResponse:
    return JobPostingResponse(
        id=job.id,
        title=job.title,
        slug=job.slug,
        department=job.department,
        employment_type=job.employment_type,
        workplace_type=job.workplace_type,
        location=job.location,
        duration=job.duration,
        compensation_type=job.compensation_type,
        compensation_amount=job.compensation_amount,
        short_description=job.short_description or "",
        description=job.description or "",
        responsibilities=job.responsibilities or "",
        requirements=job.requirements or "",
        nice_to_have=job.nice_to_have or "",
        what_you_will_learn=job.what_you_will_learn or "",
        benefits=job.benefits or "",
        application_method=job.application_method or "internal",
        application_url=job.application_url,
        status=job.status,
        published_at=job.published_at.isoformat() if job.published_at else None,
        expires_at=job.expires_at.isoformat() if job.expires_at else None,
        created_at=job.created_at.isoformat() if job.created_at else "",
        updated_at=job.updated_at.isoformat() if job.updated_at else "",
        json_ld=generate_job_json_ld(job) if include_json_ld else None,
    )


def _to_admin_job_response(job: JobPosting, application_count: int = 0) -> AdminJobPostingResponse:
    base = _to_job_response(job, include_json_ld=False)
    return AdminJobPostingResponse(
        **base.model_dump(),
        application_count=application_count,
    )


def _to_application_response(app: JobApplication, job_title: str | None = None, job_slug: str | None = None) -> JobApplicationResponse:
    return JobApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        job_title=job_title or (app.job.title if getattr(app, "job", None) else None),
        job_slug=job_slug or (app.job.slug if getattr(app, "job", None) else None),
        name=app.name,
        email=app.email,
        phone=app.phone,
        resume=app.resume,
        github_url=app.github_url,
        linkedin_url=app.linkedin_url,
        portfolio_url=app.portfolio_url,
        cover_letter=app.cover_letter,
        status=app.status,
        created_at=app.created_at.isoformat() if app.created_at else "",
        updated_at=app.updated_at.isoformat() if app.updated_at else "",
    )


def _to_public_application_response(app: JobApplication, job_title: str | None = None, job_slug: str | None = None) -> JobApplicationPublicResponse:
    return JobApplicationPublicResponse(
        id=app.id,
        job_title=job_title or (app.job.title if getattr(app, "job", None) else None),
        job_slug=job_slug or (app.job.slug if getattr(app, "job", None) else None),
        name=app.name,
        email=app.email,
        status=app.status,
        message="Application submitted successfully.",
        created_at=app.created_at.isoformat() if app.created_at else "",
    )


# ---------------------------------------------------------------------------
# Public Careers Service Functions
# ---------------------------------------------------------------------------

async def get_published_jobs(
    db: AsyncSession,
    department: str | None = None,
    workplace_type: str | None = None,
    search: str | None = None,
) -> list[JobPostingResponse]:
    """Fetch active published jobs."""
    now = _now()
    conditions = [
        JobPosting.status == "published",
        or_(JobPosting.expires_at.is_(None), JobPosting.expires_at > now),
    ]

    if department and department.strip().lower() != "all":
        conditions.append(func.lower(JobPosting.department) == department.strip().lower())

    if workplace_type and workplace_type.strip().lower() != "all":
        conditions.append(JobPosting.workplace_type == workplace_type.strip().lower())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(JobPosting.title).like(term),
                func.lower(JobPosting.short_description).like(term),
                func.lower(JobPosting.description).like(term),
            )
        )

    stmt = select(JobPosting).where(and_(*conditions)).order_by(JobPosting.published_at.desc().nullslast(), JobPosting.created_at.desc())
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    return [_to_job_response(j, include_json_ld=False) for j in jobs]


async def get_published_job_by_slug(db: AsyncSession, slug: str) -> JobPostingResponse:
    """Fetch a single published job by slug."""
    now = _now()
    stmt = select(JobPosting).where(
        JobPosting.slug == slug.strip().lower(),
        JobPosting.status == "published",
        or_(JobPosting.expires_at.is_(None), JobPosting.expires_at > now),
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "JOB_NOT_FOUND", "message": "Job posting not found or is no longer accepting applications."},
        )
    return _to_job_response(job, include_json_ld=True)


async def save_application_resume(file_bytes: bytes, original_filename: str) -> str:
    """Save an application resume file to disk and return the stored filename."""
    ensure_dir = _ensure_resumes_dir()
    # Strip any directory traversal characters and get pure basename
    safe_basename = Path(original_filename.strip()).name
    clean_name = re.sub(r"[^a-zA-Z0-9._-]", "_", safe_basename)
    if not clean_name or clean_name.startswith("."):
        clean_name = f"resume_{uuid.uuid4().hex[:8]}.pdf"
    unique_name = f"{uuid.uuid4().hex}_{clean_name}"
    file_path = (ensure_dir / unique_name).resolve()
    if ensure_dir.resolve() not in file_path.parents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_FILENAME", "message": "Invalid filename path."},
        )
    file_path.write_bytes(file_bytes)
    return unique_name


async def submit_application(
    db: AsyncSession,
    slug: str,
    app_data: JobApplicationCreate,
    resume_bytes: bytes | None = None,
    original_filename: str | None = None,
) -> JobApplicationPublicResponse:
    """Submit a candidate application for a published job."""
    now = _now()
    stmt = select(JobPosting).where(
        JobPosting.slug == slug.strip().lower(),
        JobPosting.status == "published",
        or_(JobPosting.expires_at.is_(None), JobPosting.expires_at > now),
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "JOB_NOT_FOUND", "message": "Job posting not found or is no longer accepting applications."},
        )

    resume_reference = app_data.resume.strip()
    if resume_bytes and original_filename:
        resume_reference = await save_application_resume(resume_bytes, original_filename)

    if not resume_reference:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "RESUME_REQUIRED", "message": "A resume file or link is required."},
        )

    application = JobApplication(
        job_id=job.id,
        name=app_data.name.strip(),
        email=app_data.email.strip().lower(),
        phone=app_data.phone.strip() if app_data.phone else None,
        resume=resume_reference,
        github_url=app_data.github_url.strip() if app_data.github_url else None,
        linkedin_url=app_data.linkedin_url.strip() if app_data.linkedin_url else None,
        portfolio_url=app_data.portfolio_url.strip() if app_data.portfolio_url else None,
        cover_letter=app_data.cover_letter.strip() if app_data.cover_letter else None,
        status="new",
    )

    db.add(application)
    await db.commit()
    await db.refresh(application)

    return _to_public_application_response(application, job_title=job.title, job_slug=job.slug)



# ---------------------------------------------------------------------------
# Admin Careers Service Functions
# ---------------------------------------------------------------------------

async def list_admin_jobs(
    db: AsyncSession,
    status_filter: str | None = None,
    department: str | None = None,
    search: str | None = None,
) -> list[AdminJobPostingResponse]:
    """List all jobs with application counts for admin dashboard."""
    conditions = []
    if status_filter and status_filter.strip().lower() != "all":
        conditions.append(JobPosting.status == status_filter.strip().lower())

    if department and department.strip().lower() != "all":
        conditions.append(func.lower(JobPosting.department) == department.strip().lower())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(JobPosting.title).like(term),
                func.lower(JobPosting.slug).like(term),
                func.lower(JobPosting.short_description).like(term),
            )
        )

    # Subquery for application counts
    app_count_subquery = (
        select(JobApplication.job_id, func.count(JobApplication.id).label("app_count"))
        .group_by(JobApplication.job_id)
        .subquery()
    )

    stmt = (
        select(JobPosting, func.coalesce(app_count_subquery.c.app_count, 0).label("app_count"))
        .outerjoin(app_count_subquery, JobPosting.id == app_count_subquery.c.job_id)
        .where(and_(*conditions) if conditions else True)
        .order_by(JobPosting.created_at.desc())
    )

    result = await db.execute(stmt)
    rows = result.all()
    return [_to_admin_job_response(job, count) for job, count in rows]


async def create_job(db: AsyncSession, data: JobPostingCreate) -> AdminJobPostingResponse:
    """Create a new job posting."""
    # Check if slug exists
    clean_slug = data.slug.strip().lower()
    existing = await db.execute(select(JobPosting).where(JobPosting.slug == clean_slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "SLUG_EXISTS", "message": f"Job slug '{clean_slug}' already exists. Please choose a unique slug."},
        )

    now = _now()
    published_at = now if data.status == "published" else None

    expires_at = None
    if data.expires_at:
        try:
            expires_at = datetime.fromisoformat(data.expires_at.replace("Z", "+00:00"))
        except ValueError:
            pass

    job = JobPosting(
        title=data.title.strip(),
        slug=clean_slug,
        department=data.department.strip(),
        employment_type=data.employment_type,
        workplace_type=data.workplace_type,
        location=data.location.strip() or "Remote",
        duration=data.duration.strip() if data.duration else None,
        compensation_type=data.compensation_type.strip() if data.compensation_type else None,
        compensation_amount=data.compensation_amount.strip() if data.compensation_amount else None,
        short_description=data.short_description.strip() if data.short_description else "",
        description=data.description.strip(),
        responsibilities=data.responsibilities.strip() if data.responsibilities else "",
        requirements=data.requirements.strip() if data.requirements else "",
        nice_to_have=data.nice_to_have.strip() if data.nice_to_have else "",
        what_you_will_learn=data.what_you_will_learn.strip() if data.what_you_will_learn else "",
        benefits=data.benefits.strip() if data.benefits else "",
        application_method=data.application_method or "internal",
        application_url=data.application_url.strip() if data.application_url else None,
        status=data.status,
        published_at=published_at,
        expires_at=expires_at,
    )

    db.add(job)
    await db.commit()
    await db.refresh(job)

    return _to_admin_job_response(job, application_count=0)


async def get_admin_job_by_id(db: AsyncSession, job_id: str) -> AdminJobPostingResponse:
    """Get single job details for admin with application count."""
    stmt = select(JobPosting).where(JobPosting.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "JOB_NOT_FOUND", "message": "Job not found."},
        )

    count_stmt = select(func.count(JobApplication.id)).where(JobApplication.job_id == job_id)
    count_res = await db.execute(count_stmt)
    app_count = count_res.scalar() or 0

    return _to_admin_job_response(job, application_count=app_count)


async def update_job(db: AsyncSession, job_id: str, data: JobPostingUpdate) -> AdminJobPostingResponse:
    """Update job posting fields."""
    stmt = select(JobPosting).where(JobPosting.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "JOB_NOT_FOUND", "message": "Job not found."},
        )

    if data.slug is not None:
        clean_slug = data.slug.strip().lower()
        if clean_slug != job.slug:
            existing = await db.execute(select(JobPosting).where(JobPosting.slug == clean_slug, JobPosting.id != job_id))
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"error": "SLUG_EXISTS", "message": f"Slug '{clean_slug}' is already taken by another job."},
                )
            job.slug = clean_slug

    if data.title is not None:
        job.title = data.title.strip()
    if data.department is not None:
        job.department = data.department.strip()
    if data.employment_type is not None:
        job.employment_type = data.employment_type
    if data.workplace_type is not None:
        job.workplace_type = data.workplace_type
    if data.location is not None:
        job.location = data.location.strip()
    if data.duration is not None:
        job.duration = data.duration.strip() or None
    if data.compensation_type is not None:
        job.compensation_type = data.compensation_type.strip() or None
    if data.compensation_amount is not None:
        job.compensation_amount = data.compensation_amount.strip() or None
    if data.short_description is not None:
        job.short_description = data.short_description.strip()
    if data.description is not None:
        job.description = data.description.strip()
    if data.responsibilities is not None:
        job.responsibilities = data.responsibilities.strip()
    if data.requirements is not None:
        job.requirements = data.requirements.strip()
    if data.nice_to_have is not None:
        job.nice_to_have = data.nice_to_have.strip()
    if data.what_you_will_learn is not None:
        job.what_you_will_learn = data.what_you_will_learn.strip()
    if data.benefits is not None:
        job.benefits = data.benefits.strip()
    if data.application_method is not None:
        job.application_method = data.application_method
    if data.application_url is not None:
        job.application_url = data.application_url.strip() or None

    if data.status is not None and data.status != job.status:
        job.status = data.status
        if data.status == "published" and not job.published_at:
            job.published_at = _now()

    if data.expires_at is not None:
        if data.expires_at:
            try:
                job.expires_at = datetime.fromisoformat(data.expires_at.replace("Z", "+00:00"))
            except ValueError:
                pass
        else:
            job.expires_at = None

    await db.commit()
    await db.refresh(job)

    count_stmt = select(func.count(JobApplication.id)).where(JobApplication.job_id == job_id)
    count_res = await db.execute(count_stmt)
    app_count = count_res.scalar() or 0

    return _to_admin_job_response(job, application_count=app_count)


async def update_job_status(db: AsyncSession, job_id: str, new_status: str) -> AdminJobPostingResponse:
    """Quick update for job status (draft/published/closed)."""
    if new_status not in ("draft", "published", "closed"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "INVALID_STATUS", "message": "Status must be 'draft', 'published', or 'closed'."},
        )

    stmt = select(JobPosting).where(JobPosting.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "JOB_NOT_FOUND", "message": "Job not found."},
        )

    job.status = new_status
    if new_status == "published" and not job.published_at:
        job.published_at = _now()

    await db.commit()
    await db.refresh(job)

    count_stmt = select(func.count(JobApplication.id)).where(JobApplication.job_id == job_id)
    count_res = await db.execute(count_stmt)
    app_count = count_res.scalar() or 0

    return _to_admin_job_response(job, application_count=app_count)


async def delete_job(db: AsyncSession, job_id: str) -> dict:
    """Delete a job posting and all its applications."""
    stmt = select(JobPosting).where(JobPosting.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "JOB_NOT_FOUND", "message": "Job not found."},
        )

    await db.delete(job)
    await db.commit()
    return {"status": "success", "message": f"Job '{job.title}' deleted successfully."}


async def list_admin_applications(
    db: AsyncSession,
    job_id: str | None = None,
    status_filter: str | None = None,
    search: str | None = None,
) -> list[JobApplicationResponse]:
    """List applications for admin dashboard."""
    conditions = []
    if job_id and job_id.strip() != "all":
        conditions.append(JobApplication.job_id == job_id.strip())

    if status_filter and status_filter.strip().lower() != "all":
        conditions.append(JobApplication.status == status_filter.strip().lower())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(JobApplication.name).like(term),
                func.lower(JobApplication.email).like(term),
                func.lower(JobApplication.phone).like(term),
            )
        )

    stmt = (
        select(JobApplication)
        .options(selectinload(JobApplication.job))
        .where(and_(*conditions) if conditions else True)
        .order_by(JobApplication.created_at.desc())
    )

    result = await db.execute(stmt)
    apps = result.scalars().all()
    return [_to_application_response(a) for a in apps]


async def get_admin_application_by_id(db: AsyncSession, app_id: str) -> JobApplicationResponse:
    """Get single application details."""
    stmt = select(JobApplication).options(selectinload(JobApplication.job)).where(JobApplication.id == app_id)
    result = await db.execute(stmt)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "APPLICATION_NOT_FOUND", "message": "Application not found."},
        )
    return _to_application_response(app)


async def update_application_status(db: AsyncSession, app_id: str, new_status: str) -> JobApplicationResponse:
    """Update status of a candidate application."""
    if new_status not in ("new", "reviewing", "shortlisted", "interview", "rejected", "hired"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "INVALID_STATUS", "message": "Invalid application status."},
        )

    stmt = select(JobApplication).options(selectinload(JobApplication.job)).where(JobApplication.id == app_id)
    result = await db.execute(stmt)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "APPLICATION_NOT_FOUND", "message": "Application not found."},
        )

    app.status = new_status
    await db.commit()
    await db.refresh(app)
    return _to_application_response(app)


async def get_application_resume_file(db: AsyncSession, app_id: str) -> tuple[Path, str]:
    """Retrieve resume file path and filename for download."""
    stmt = select(JobApplication).where(JobApplication.id == app_id)
    result = await db.execute(stmt)
    app = result.scalar_one_or_none()
    if not app or not app.resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RESUME_NOT_FOUND", "message": "Resume file not found."},
        )

    # If the resume is stored as an external URL
    if app.resume.startswith("http://") or app.resume.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "EXTERNAL_RESUME", "message": f"Resume is hosted externally: {app.resume}"},
        )

    resume_dir = _ensure_resumes_dir()
    safe_name = Path(app.resume).name
    file_path = (resume_dir / safe_name).resolve()
    if resume_dir.resolve() not in file_path.parents or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RESUME_NOT_FOUND", "message": "Resume file does not exist on disk."},
        )

    return file_path, safe_name


# ---------------------------------------------------------------------------
# Sitemap XML Generation
# ---------------------------------------------------------------------------

async def generate_careers_sitemap_xml(db: AsyncSession, base_url: str = BASE_SITE_URL) -> str:
    """Build dynamic sitemap XML containing /careers and active published job URLs."""
    now = _now()
    today = now.strftime("%Y-%m-%d")

    stmt = select(JobPosting).where(
        JobPosting.status == "published",
        or_(JobPosting.expires_at.is_(None), JobPosting.expires_at > now),
    ).order_by(JobPosting.published_at.desc())

    result = await db.execute(stmt)
    published_jobs = result.scalars().all()

    urls = [
        f"""  <url>
    <loc>{base_url}/careers</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>"""
    ]

    for job in published_jobs:
        job_date = (job.updated_at or job.published_at or now).strftime("%Y-%m-%d")
        urls.append(
            f"""  <url>
    <loc>{base_url}/careers/{job.slug}</loc>
    <lastmod>{job_date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>"""
        )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(urls)}
</urlset>"""
