from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.rate_limit import limiter
from app.models import JobPostingResponse, JobApplicationResponse, JobApplicationPublicResponse, JobApplicationCreate
from app.services import careers_service

router = APIRouter()

MAX_RESUME_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}


def _validate_resume_content(filename: str, content: bytes) -> None:
    """Validate uploaded resume content using magic bytes and block executables."""
    ext = Path(filename).suffix.lower()

    # Block well-known binary executable headers regardless of extension
    if content[:2] == b"MZ":  # DOS / Windows PE Executable
        raise HTTPException(
            status_code=422,
            detail={"error": "INVALID_FILE", "message": "Executable files are not permitted as resumes."},
        )
    if content[:4] == b"\x7fELF":  # Linux ELF Executable
        raise HTTPException(
            status_code=422,
            detail={"error": "INVALID_FILE", "message": "Executable files are not permitted as resumes."},
        )
    if content[:4] in (b"\xca\xfe\xba\xbe", b"\xfe\xed\xfa\xce", b"\xfe\xed\xfa\xcf", b"\xce\xfa\xed\xfe"):  # Mach-O / Java Class
        raise HTTPException(
            status_code=422,
            detail={"error": "INVALID_FILE", "message": "Binary executable files are not permitted as resumes."},
        )

    # Magic byte checks per allowed extension
    if ext == ".pdf":
        if not content.startswith(b"%PDF"):
            raise HTTPException(
                status_code=422,
                detail={"error": "INVALID_FILE", "message": "File extension is .pdf but content is not a valid PDF document."},
            )
    elif ext == ".docx":
        if not content.startswith(b"PK"):
            raise HTTPException(
                status_code=422,
                detail={"error": "INVALID_FILE", "message": "File extension is .docx but content is not a valid Office document."},
            )
    elif ext == ".doc":
        if not content.startswith(b"\xd0\xcf\x11\xe0"):
            raise HTTPException(
                status_code=422,
                detail={"error": "INVALID_FILE", "message": "File extension is .doc but content is not a valid Word document."},
            )
    elif ext == ".txt":
        if b"\x00" in content:
            raise HTTPException(
                status_code=422,
                detail={"error": "INVALID_FILE", "message": "Text resume contains invalid binary characters."},
            )


@router.get("", response_model=list[JobPostingResponse])
async def list_careers(
    department: str | None = Query(None),
    workplace_type: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all active, published job openings."""
    return await careers_service.get_published_jobs(
        db=db,
        department=department,
        workplace_type=workplace_type,
        search=search,
    )


@router.get("/sitemap.xml")
async def careers_sitemap(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Generate dynamic XML sitemap for careers and active job pages."""
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    xml_content = await careers_service.generate_careers_sitemap_xml(db, base_url=base_url)
    return Response(content=xml_content, media_type="application/xml")


@router.get("/{slug}", response_model=JobPostingResponse)
async def get_career_job(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get single published job details by slug (includes JobPosting JSON-LD)."""
    return await careers_service.get_published_job_by_slug(db=db, slug=slug)


@router.post("/{slug}/apply", response_model=JobApplicationPublicResponse)
@limiter.limit("5/minute")
async def apply_for_job(
    request: Request,
    slug: str,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(None),
    github_url: str = Form(None),
    linkedin_url: str = Form(None),
    portfolio_url: str = Form(None),
    cover_letter: str = Form(None),
    resume_file: UploadFile | None = File(None),
    resume_url: str = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Submit application for a published job role."""
    resume_bytes = None
    original_filename = None

    if resume_file and resume_file.filename:
        # Validate extension
        filename_lower = resume_file.filename.lower()
        if not any(filename_lower.endswith(ext) for ext in ALLOWED_RESUME_EXTENSIONS):
            raise HTTPException(
                status_code=422,
                detail={"error": "INVALID_FILE_TYPE", "message": "Resume must be a PDF, DOCX, DOC, or TXT file."},
            )

        content = await resume_file.read()
        if len(content) > MAX_RESUME_SIZE:
            raise HTTPException(
                status_code=413,
                detail={"error": "PAYLOAD_TOO_LARGE", "message": "Resume file exceeds maximum size of 10MB."},
            )

        # Validate magic bytes and executable blocking
        _validate_resume_content(resume_file.filename, content)

        resume_bytes = content
        original_filename = resume_file.filename
    elif resume_url:
        pass
    else:
        raise HTTPException(
            status_code=422,
            detail={"error": "RESUME_REQUIRED", "message": "Please attach a resume document or provide a link."},
        )

    app_data = JobApplicationCreate(
        name=name,
        email=email,
        phone=phone,
        resume=resume_url or (original_filename or ""),
        github_url=github_url,
        linkedin_url=linkedin_url,
        portfolio_url=portfolio_url,
        cover_letter=cover_letter,
    )

    return await careers_service.submit_application(
        db=db,
        slug=slug,
        app_data=app_data,
        resume_bytes=resume_bytes,
        original_filename=original_filename,
    )
