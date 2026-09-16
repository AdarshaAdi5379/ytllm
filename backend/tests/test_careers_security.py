import io
import unittest
from datetime import datetime
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.db_models import Base, User, JobPosting, JobApplication
from app.database import get_db
from app.main import app
from app.middleware.rate_limit import limiter
from app.services.auth_service import create_token, hash_password
from app.services import careers_service


class TestCareersSecurity(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Reset rate limiter storage between tests
        if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
            limiter._storage.storage.clear()

        self.engine = create_async_engine(
            "sqlite+aiosqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.async_session = async_sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async def override_get_db():
            async with self.async_session() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Seed users
        async with self.async_session() as session:
            self.admin_user = User(
                email="security_admin@scritur.space",
                password_hash=hash_password("admin_sec_pass_123"),
                is_admin=1,
            )
            self.regular_user = User(
                email="attacker@example.com",
                password_hash=hash_password("attacker_pass_123"),
                is_admin=0,
            )
            session.add(self.admin_user)
            session.add(self.regular_user)
            await session.commit()
            await session.refresh(self.admin_user)
            await session.refresh(self.regular_user)

            self.admin_token = create_token(self.admin_user.id)
            self.user_token = create_token(self.regular_user.id)

            # Create test job postings (one published, one draft, one closed)
            self.published_job = JobPosting(
                title="Security Engineer",
                slug="security-engineer",
                department="Security",
                employment_type="full_time",
                workplace_type="remote",
                location="Remote",
                description="Secure Scritur infrastructure.",
                status="published",
                published_at=datetime.utcnow(),
            )
            self.draft_job = JobPosting(
                title="Confidential Exec Role",
                slug="confidential-exec-role",
                department="Executive",
                employment_type="full_time",
                workplace_type="remote",
                location="Remote",
                description="Unannounced leadership position.",
                status="draft",
            )
            self.closed_job = JobPosting(
                title="Legacy Python Dev",
                slug="legacy-python-dev",
                department="Engineering",
                employment_type="contract",
                workplace_type="remote",
                location="Remote",
                description="Position has ended.",
                status="closed",
            )
            session.add(self.published_job)
            session.add(self.draft_job)
            session.add(self.closed_job)
            await session.commit()
            await session.refresh(self.published_job)
            await session.refresh(self.draft_job)
            await session.refresh(self.closed_job)

            self.published_job_id = self.published_job.id
            self.draft_job_id = self.draft_job.id

            # Create an application for testing
            self.test_app = JobApplication(
                job_id=self.published_job.id,
                name="Candidate Alpha",
                email="alpha@example.com",
                phone="+1-555-1234",
                resume="sample_resume.pdf",
                cover_letter="Cover letter text",
                status="new",
            )
            session.add(self.test_app)
            await session.commit()
            await session.refresh(self.test_app)
            self.test_app_id = self.test_app.id

    async def asyncTearDown(self):
        if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
            limiter._storage.storage.clear()
        app.dependency_overrides.clear()
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await self.engine.dispose()

    # -------------------------------------------------------------------------
    # 1. RBAC Tests: Complete audit across all /api/admin/careers endpoints
    # -------------------------------------------------------------------------
    async def test_all_admin_endpoints_reject_unauthenticated(self):
        """Verify unauthenticated requests (missing/invalid token) receive 401."""
        endpoints = [
            ("GET", "/api/admin/careers/jobs"),
            ("POST", "/api/admin/careers/jobs"),
            ("GET", f"/api/admin/careers/jobs/{self.published_job_id}"),
            ("PUT", f"/api/admin/careers/jobs/{self.published_job_id}"),
            ("PATCH", f"/api/admin/careers/jobs/{self.published_job_id}/status"),
            ("DELETE", f"/api/admin/careers/jobs/{self.published_job_id}"),
            ("GET", "/api/admin/careers/applications"),
            ("GET", f"/api/admin/careers/applications/{self.test_app_id}"),
            ("PATCH", f"/api/admin/careers/applications/{self.test_app_id}/status"),
            ("GET", f"/api/admin/careers/applications/{self.test_app_id}/resume"),
        ]

        for method, url in endpoints:
            with self.subTest(method=method, url=url):
                res = self.client.request(method, url)
                self.assertEqual(
                    res.status_code,
                    401,
                    f"Expected 401 for unauthenticated {method} {url}, got {res.status_code}",
                )

    async def test_all_admin_endpoints_reject_non_admin_users(self):
        """Verify non-admin authenticated users receive 403 Forbidden."""
        headers = {"Authorization": f"Bearer {self.user_token}"}
        endpoints = [
            ("GET", "/api/admin/careers/jobs", None),
            ("POST", "/api/admin/careers/jobs", {"title": "X", "slug": "x", "department": "Y", "employment_type": "full_time", "workplace_type": "remote"}),
            ("GET", f"/api/admin/careers/jobs/{self.published_job_id}", None),
            ("PUT", f"/api/admin/careers/jobs/{self.published_job_id}", {"title": "New Title"}),
            ("PATCH", f"/api/admin/careers/jobs/{self.published_job_id}/status", {"status": "closed"}),
            ("DELETE", f"/api/admin/careers/jobs/{self.published_job_id}", None),
            ("GET", "/api/admin/careers/applications", None),
            ("GET", f"/api/admin/careers/applications/{self.test_app_id}", None),
            ("PATCH", f"/api/admin/careers/applications/{self.test_app_id}/status", {"status": "rejected"}),
            ("GET", f"/api/admin/careers/applications/{self.test_app_id}/resume", None),
        ]

        for method, url, body in endpoints:
            with self.subTest(method=method, url=url):
                kwargs = {"headers": headers}
                if body is not None:
                    kwargs["json"] = body
                res = self.client.request(method, url, **kwargs)
                self.assertEqual(
                    res.status_code,
                    403,
                    f"Expected 403 for non-admin {method} {url}, got {res.status_code}",
                )

    # -------------------------------------------------------------------------
    # 2. File Upload & Magic Byte Validation Tests
    # -------------------------------------------------------------------------
    async def test_valid_pdf_upload_accepted(self):
        """Upload with valid %PDF header is accepted."""
        fake_pdf = b"%PDF-1.5 \n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        files = {"resume_file": ("my_resume.pdf", io.BytesIO(fake_pdf), "application/pdf")}
        data = {
            "name": "Alice Candidate",
            "email": "alice@example.com",
        }
        res = self.client.post("/api/careers/security-engineer/apply", data=data, files=files)
        self.assertEqual(res.status_code, 200)
        json_data = res.json()
        self.assertEqual(json_data["name"], "Alice Candidate")
        self.assertEqual(json_data["status"], "new")

    async def test_valid_docx_upload_accepted(self):
        """Upload with valid PK (ZIP) header is accepted."""
        fake_docx = b"PK\x03\x04\x14\x00\x00\x00\x08\x00word/document.xml"
        files = {"resume_file": ("resume.docx", io.BytesIO(fake_docx), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        data = {
            "name": "Bob Candidate",
            "email": "bob@example.com",
        }
        res = self.client.post("/api/careers/security-engineer/apply", data=data, files=files)
        self.assertEqual(res.status_code, 200)

    async def test_executable_disguised_as_pdf_rejected(self):
        """Executable binary with MZ header disguised as .pdf is rejected with 422."""
        fake_exe = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This is a Windows PE executable"
        files = {"resume_file": ("malicious.pdf", io.BytesIO(fake_exe), "application/pdf")}
        data = {
            "name": "Eve Malicious",
            "email": "eve@example.com",
        }
        res = self.client.post("/api/careers/security-engineer/apply", data=data, files=files)
        self.assertEqual(res.status_code, 422)
        self.assertIn("INVALID_FILE", res.text)

    async def test_linux_elf_executable_disguised_as_docx_rejected(self):
        """Linux ELF binary disguised as .docx is rejected with 422."""
        fake_elf = b"\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00"
        files = {"resume_file": ("exploit.docx", io.BytesIO(fake_elf), "application/octet-stream")}
        data = {
            "name": "Eve Malicious",
            "email": "eve@example.com",
        }
        res = self.client.post("/api/careers/security-engineer/apply", data=data, files=files)
        self.assertEqual(res.status_code, 422)
        self.assertIn("INVALID_FILE", res.text)

    async def test_invalid_extension_rejected(self):
        """Disallowed file extension (.sh, .exe, .py) is rejected with 422."""
        files = {"resume_file": ("script.sh", io.BytesIO(b"#!/bin/bash\necho pwned"), "text/x-sh")}
        data = {
            "name": "Attacker",
            "email": "attacker@example.com",
        }
        res = self.client.post("/api/careers/security-engineer/apply", data=data, files=files)
        self.assertEqual(res.status_code, 422)
        self.assertIn("INVALID_FILE_TYPE", res.text)

    async def test_payload_too_large_rejected(self):
        """File larger than 10MB is rejected with 413 Payload Too Large."""
        oversized_data = b"%PDF" + b"0" * (10 * 1024 * 1024 + 100)
        files = {"resume_file": ("huge.pdf", io.BytesIO(oversized_data), "application/pdf")}
        data = {
            "name": "Big Candidate",
            "email": "big@example.com",
        }
        res = self.client.post("/api/careers/security-engineer/apply", data=data, files=files)
        self.assertEqual(res.status_code, 413)
        self.assertIn("PAYLOAD_TOO_LARGE", res.text)

    # -------------------------------------------------------------------------
    # 3. Path Traversal & Resume Storage Hardening
    # -------------------------------------------------------------------------
    async def test_resume_filename_sanitization_and_traversal_prevention(self):
        """Uploads with path traversal patterns are sanitized to safe basenames."""
        fake_pdf = b"%PDF-1.4\nSafe content\n%%EOF"
        traversal_filename = "../../../../etc/passwd.pdf"
        files = {"resume_file": (traversal_filename, io.BytesIO(fake_pdf), "application/pdf")}
        data = {
            "name": "Traversal Tester",
            "email": "traversal@example.com",
        }
        res = self.client.post("/api/careers/security-engineer/apply", data=data, files=files)
        self.assertEqual(res.status_code, 200)

        # Check in database what filename was stored
        async with self.async_session() as session:
            stmt = select_app = JobApplication.__table__.select().where(
                JobApplication.email == "traversal@example.com"
            )
            result = await session.execute(stmt)
            saved_app = result.fetchone()
            self.assertIsNotNone(saved_app)
            stored_resume = saved_app.resume
            self.assertNotIn("..", stored_resume)
            self.assertNotIn("/", stored_resume)
            self.assertNotIn("\\", stored_resume)
            self.assertTrue(stored_resume.endswith("passwd.pdf"))

    async def test_external_url_resume_download_rejected(self):
        """Admin download of an application with an external URL resume returns 400."""
        # Create an app with an external URL resume
        async with self.async_session() as session:
            url_app = JobApplication(
                job_id=self.published_job_id,
                name="External Candidate",
                email="ext@example.com",
                resume="https://portfolio.example.com/resume.pdf",
                status="new",
            )
            session.add(url_app)
            await session.commit()
            await session.refresh(url_app)
            url_app_id = url_app.id

        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = self.client.get(
            f"/api/admin/careers/applications/{url_app_id}/resume",
            headers=admin_headers,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("EXTERNAL_RESUME", res.text)

    # -------------------------------------------------------------------------
    # 4. Candidate Privacy & Data Exposure Tests
    # -------------------------------------------------------------------------
    async def test_candidate_apply_response_does_not_leak_internal_paths(self):
        """Application submission response does not leak internal server paths or tokens."""
        fake_pdf = b"%PDF-1.4\nTest Resume\n%%EOF"
        files = {"resume_file": ("test_cv.pdf", io.BytesIO(fake_pdf), "application/pdf")}
        data = {
            "name": "Privacy Candidate",
            "email": "privacy@example.com",
            "phone": "+1 555-9876",
            "cover_letter": "Confidential cover letter content",
        }
        res = self.client.post("/api/careers/security-engineer/apply", data=data, files=files)
        self.assertEqual(res.status_code, 200)
        response_json = res.json()

        # Should only contain public fields
        self.assertIn("id", response_json)
        self.assertIn("name", response_json)
        self.assertIn("email", response_json)
        self.assertIn("status", response_json)
        self.assertIn("message", response_json)
        # Should NOT contain internal server resume path or cover letter in public response
        self.assertNotIn("resume", response_json)
        self.assertNotIn("cover_letter", response_json)
        self.assertNotIn("phone", response_json)

    # -------------------------------------------------------------------------
    # 5. Draft & Closed Job Privacy Tests
    # -------------------------------------------------------------------------
    async def test_draft_and_closed_jobs_never_leak_to_public(self):
        """Public list, public detail, and public sitemap exclude draft and closed jobs."""
        # Public listing
        list_res = self.client.get("/api/careers")
        self.assertEqual(list_res.status_code, 200)
        slugs = [j["slug"] for j in list_res.json()]
        self.assertIn("security-engineer", slugs)
        self.assertNotIn("confidential-exec-role", slugs)
        self.assertNotIn("legacy-python-dev", slugs)

        # Direct slug lookup for draft -> 404
        draft_res = self.client.get("/api/careers/confidential-exec-role")
        self.assertEqual(draft_res.status_code, 404)

        # Direct slug lookup for closed -> 404
        closed_res = self.client.get("/api/careers/legacy-python-dev")
        self.assertEqual(closed_res.status_code, 404)

        # Dynamic sitemap exclusion
        sitemap_res = self.client.get("/api/careers/sitemap.xml")
        self.assertEqual(sitemap_res.status_code, 200)
        sitemap_xml = sitemap_res.text
        self.assertIn("/careers/security-engineer", sitemap_xml)
        self.assertNotIn("/careers/confidential-exec-role", sitemap_xml)
        self.assertNotIn("/careers/legacy-python-dev", sitemap_xml)

    # -------------------------------------------------------------------------
    # 7. Direct Public Access & Unpredictability Tests
    # -------------------------------------------------------------------------
    async def test_direct_public_access_to_resumes_returns_404(self):
        """Direct HTTP requests attempting to access backend/data/resumes via public paths return 404."""
        test_filename = "test_candidate_resume.pdf"
        direct_paths = [
            f"/data/resumes/{test_filename}",
            f"/resumes/{test_filename}",
            f"/static/resumes/{test_filename}",
            f"/static/{test_filename}",
            f"/api/data/resumes/{test_filename}",
            f"/api/resumes/{test_filename}",
            f"/api/static/{test_filename}",
            f"/uploads/{test_filename}",
        ]

        for path in direct_paths:
            with self.subTest(path=path):
                res = self.client.get(path)
                self.assertEqual(
                    res.status_code,
                    404,
                    f"Direct filesystem path {path} should return 404, got {res.status_code}",
                )

    async def test_resume_filename_unpredictable_entropy(self):
        """Generated stored filenames must contain high-entropy UUIDs (128-bit hex) preventing guessing."""
        fake_pdf = b"%PDF-1.4\nUnique Entropy Check\n%%EOF"
        files = {"resume_file": ("my_resume.pdf", io.BytesIO(fake_pdf), "application/pdf")}
        data = {
            "name": "Entropy Candidate",
            "email": "entropy@example.com",
        }
        res = self.client.post("/api/careers/security-engineer/apply", data=data, files=files)
        self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            stmt = select_app = JobApplication.__table__.select().where(
                JobApplication.email == "entropy@example.com"
            )
            result = await session.execute(stmt)
            saved_app = result.fetchone()
            self.assertIsNotNone(saved_app)
            stored_name = saved_app.resume

            # Stored filename format: <32-hex uuid>_<cleaned_basename>
            parts = stored_name.split("_", 1)
            self.assertEqual(len(parts[0]), 32, "UUID prefix must be a 32-character hexadecimal string")
            int(parts[0], 16)  # Validates hexadecimal
            self.assertIn("my_resume.pdf", parts[1])


if __name__ == "__main__":
    unittest.main()
