import unittest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.db_models import Base, User, JobPosting, JobApplication
from app.database import get_db
from app.main import app
from app.services.auth_service import create_token, hash_password


class TestCareersSystem(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Create an in-memory SQLite database for testing
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

        # Seed admin and regular user
        async with self.async_session() as session:
            self.admin_user = User(
                email="admin@scritur.space",
                password_hash=hash_password("adminpass123"),
                is_admin=1,
            )
            self.regular_user = User(
                email="user@scritur.space",
                password_hash=hash_password("userpass123"),
                is_admin=0,
            )
            session.add(self.admin_user)
            session.add(self.regular_user)
            await session.commit()
            await session.refresh(self.admin_user)
            await session.refresh(self.regular_user)

            self.admin_token = create_token(self.admin_user.id)
            self.user_token = create_token(self.regular_user.id)

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await self.engine.dispose()

    async def test_admin_rbac(self):
        """Verify unauthenticated is 401, regular user is 403, and admin is 200."""
        # Unauthenticated
        res = self.client.get("/api/admin/careers/jobs")
        self.assertEqual(res.status_code, 401)

        # Regular user
        res = self.client.get(
            "/api/admin/careers/jobs",
            headers={"Authorization": f"Bearer {self.user_token}"},
        )
        self.assertEqual(res.status_code, 403)

        # Admin user
        res = self.client.get(
            "/api/admin/careers/jobs",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    async def test_admin_job_crud_and_status(self):
        """Test full Admin Job CRUD workflow."""
        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # 1. Create a job as draft
        job_payload = {
            "title": "Senior AI Engineer",
            "slug": "senior-ai-engineer",
            "department": "Engineering",
            "employment_type": "full_time",
            "workplace_type": "remote",
            "location": "Remote",
            "compensation_type": "Salary",
            "compensation_amount": "$140,000 - $180,000",
            "short_description": "Build high-throughput RAG pipelines and AI learning tools.",
            "description": "We are seeking a Senior AI Engineer to scale our knowledge intelligence systems.",
            "responsibilities": "- Architect semantic retrieval engines\n- Optimize LLM latency",
            "requirements": "- 4+ years Python/TypeScript\n- Experience with vector DBs",
            "benefits": "- Remote first\n- Health insurance\n- Learning stipend",
            "status": "draft",
        }

        res = self.client.post("/api/admin/careers/jobs", json=job_payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        created_job = res.json()
        job_id = created_job["id"]
        self.assertEqual(created_job["status"], "draft")
        self.assertEqual(created_job["title"], "Senior AI Engineer")

        # 2. Public /careers endpoint should NOT show draft jobs
        public_res = self.client.get("/api/careers")
        self.assertEqual(public_res.status_code, 200)
        self.assertEqual(len(public_res.json()), 0)

        # 3. Publish the job
        status_res = self.client.patch(
            f"/api/admin/careers/jobs/{job_id}/status",
            json={"status": "published"},
            headers=headers,
        )
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json()["status"], "published")

        # 4. Public /careers endpoint should now show the published job
        public_res = self.client.get("/api/careers")
        self.assertEqual(public_res.status_code, 200)
        jobs = public_res.json()
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["slug"], "senior-ai-engineer")

        # 5. Public /careers/:slug endpoint returns details with JSON-LD
        detail_res = self.client.get("/api/careers/senior-ai-engineer")
        self.assertEqual(detail_res.status_code, 200)
        detail = detail_res.json()
        self.assertEqual(detail["title"], "Senior AI Engineer")
        self.assertIsNotNone(detail.get("json_ld"))
        self.assertEqual(detail["json_ld"]["@type"], "JobPosting")

        # 6. Update job details
        update_res = self.client.put(
            f"/api/admin/careers/jobs/{job_id}",
            json={"location": "San Francisco, CA or Remote"},
            headers=headers,
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["location"], "San Francisco, CA or Remote")

        # 7. Close the job
        close_res = self.client.patch(
            f"/api/admin/careers/jobs/{job_id}/status",
            json={"status": "closed"},
            headers=headers,
        )
        self.assertEqual(close_res.status_code, 200)

        # 8. Closed job must not appear in public listings or detail
        public_after_close = self.client.get("/api/careers")
        self.assertEqual(len(public_after_close.json()), 0)

        detail_after_close = self.client.get("/api/careers/senior-ai-engineer")
        self.assertEqual(detail_after_close.status_code, 404)

    async def test_job_application_flow(self):
        """Test candidate application submission and admin review pipeline."""
        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Create and publish a job
        job_payload = {
            "title": "Product Designer",
            "slug": "product-designer",
            "department": "Design",
            "employment_type": "full_time",
            "workplace_type": "remote",
            "location": "Remote",
            "description": "Design sleek user experiences for Scritur.",
            "status": "published",
        }
        res = self.client.post("/api/admin/careers/jobs", json=job_payload, headers=headers)
        self.assertEqual(res.status_code, 201)

        # Candidate submits application
        form_data = {
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phone": "+1 555-0199",
            "linkedin_url": "https://linkedin.com/in/janedoe",
            "portfolio_url": "https://janedoe.design",
            "cover_letter": "I love Scritur and would love to contribute!",
            "resume_url": "https://janedoe.design/resume.pdf",
        }
        apply_res = self.client.post("/api/careers/product-designer/apply", data=form_data)
        self.assertEqual(apply_res.status_code, 200)
        app_data = apply_res.json()
        app_id = app_data["id"]
        self.assertEqual(app_data["name"], "Jane Doe")
        self.assertEqual(app_data["status"], "new")

        # Admin lists applications
        apps_res = self.client.get("/api/admin/careers/applications", headers=headers)
        self.assertEqual(apps_res.status_code, 200)
        all_apps = apps_res.json()
        self.assertEqual(len(all_apps), 1)
        self.assertEqual(all_apps[0]["id"], app_id)

        # Admin updates application status to 'interview'
        status_update_res = self.client.patch(
            f"/api/admin/careers/applications/{app_id}/status",
            json={"status": "interview"},
            headers=headers,
        )
        self.assertEqual(status_update_res.status_code, 200)
        self.assertEqual(status_update_res.json()["status"], "interview")

    async def test_dynamic_sitemap(self):
        """Test dynamic XML sitemap only contains /careers and published jobs."""
        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Create published job and draft job
        self.client.post(
            "/api/admin/careers/jobs",
            json={
                "title": "Frontend Engineer",
                "slug": "frontend-engineer",
                "department": "Engineering",
                "description": "React & TypeScript",
                "status": "published",
            },
            headers=headers,
        )
        self.client.post(
            "/api/admin/careers/jobs",
            json={
                "title": "Secret Role",
                "slug": "secret-role",
                "department": "Executive",
                "description": "Top secret",
                "status": "draft",
            },
            headers=headers,
        )

        sitemap_res = self.client.get("/api/careers/sitemap.xml")
        self.assertEqual(sitemap_res.status_code, 200)
        xml_text = sitemap_res.text

        self.assertIn("/careers", xml_text)
        self.assertIn("/careers/frontend-engineer", xml_text)
        self.assertNotIn("/careers/secret-role", xml_text)


if __name__ == "__main__":
    unittest.main()
