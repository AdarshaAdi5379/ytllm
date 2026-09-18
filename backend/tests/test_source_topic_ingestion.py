import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

from app.db_models import Base, User, Workspace, Topic, Source, StandaloneSession, StandaloneMessage, StandaloneSource
from app.database import get_db
from app.main import app
from app.services.auth_service import create_token, hash_password
from app.services.pdf_service import PdfResult
from app.services.website_service import WebPageResult
from app.services.github_service import RepoResult, CodeChunk


class TestSourceTopicIngestion(unittest.IsolatedAsyncioTestCase):
    """Integration tests for universal topic extraction across all source ingestion flows."""

    async def asyncSetUp(self):
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

        async with self.async_session() as session:
            self.user = User(
                id="user_test_topics",
                email="topics@example.com",
                password_hash=hash_password("password123"),
            )
            session.add(self.user)
            self.workspace = Workspace(
                id="ws_test_topics",
                owner_id=self.user.id,
                name="Topic Ingestion Workspace",
            )
            session.add(self.workspace)
            await session.commit()

        self.token = create_token(self.user.id)
        self.headers = {"Authorization": f"Bearer {self.token}"}

        async def override_get_db():
            async with self.async_session() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await self.engine.dispose()

    @patch("app.services.transcript_service.fetch_video_metadata")
    @patch("app.services.transcript_service.fetch_transcript")
    @patch("app.services.embedding_service.index_transcript_segments")
    @patch("app.services.llm_service.generate_text")
    async def test_youtube_source_creates_topics(self, mock_llm, mock_embed, mock_trans, mock_meta):
        """Verify YouTube source import automatically extracts and creates workspace topics."""
        mock_meta.return_value = MagicMock(
            title="Operating Systems: Deadlock Prevention",
            channel_name="CS Lectures",
            duration="15:00",
            thumbnail_url="http://example.com/thumb.jpg",
        )
        mock_trans.return_value = MagicMock(
            text="Deadlocks occur when processes hold resources while waiting for others. Mutual exclusion and hold and wait are key conditions.",
            segments=[],
        )
        mock_embed.return_value = 5
        mock_llm.return_value = """[
            {"name": "Deadlock Conditions", "description": "Four necessary conditions for deadlocks"},
            {"name": "Mutual Exclusion", "description": "Resource sharing restrictions"}
        ]"""

        res = self.client.post(
            "/api/sources/youtube/import",
            json={
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "workspace_id": self.workspace.id,
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            topics = (await session.execute(
                select(Topic).where(Topic.workspace_id == self.workspace.id)
            )).scalars().all()
            topic_names = {t.name for t in topics}
            self.assertIn("Deadlock Conditions", topic_names)
            self.assertIn("Mutual Exclusion", topic_names)

    @patch("app.routes.sources.pdf.fetch_pdf")
    @patch("app.services.embedding_service.index_transcript")
    @patch("app.services.llm_service.generate_text")
    async def test_pdf_source_creates_topics(self, mock_llm, mock_embed, mock_fetch_pdf):
        """Verify PDF document import automatically extracts and creates workspace topics."""
        mock_fetch_pdf.return_value = PdfResult(
            url="http://example.com/paper.pdf",
            title="Machine Learning Basics",
            page_count=10,
            text="Gradient descent is an optimization algorithm used to minimize the cost function.",
            index_key="pdf_ml_basics",
        )
        mock_embed.return_value = 4
        mock_llm.return_value = """[
            {"name": "Gradient Descent", "description": "Optimization algorithm"},
            {"name": "Cost Function", "description": "Loss measurement metric"}
        ]"""

        res = self.client.post(
            "/api/sources/pdf/import",
            json={
                "url": "http://example.com/paper.pdf",
                "workspace_id": self.workspace.id,
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            topics = (await session.execute(
                select(Topic).where(Topic.workspace_id == self.workspace.id)
            )).scalars().all()
            topic_names = {t.name for t in topics}
            self.assertIn("Gradient Descent", topic_names)
            self.assertIn("Cost Function", topic_names)

    @patch("app.routes.sources.website.fetch_webpage")
    @patch("app.services.embedding_service.index_transcript")
    @patch("app.services.llm_service.generate_text")
    async def test_website_source_creates_topics(self, mock_llm, mock_embed, mock_fetch_web):
        """Verify Website page import automatically extracts and creates workspace topics."""
        mock_fetch_web.return_value = WebPageResult(
            url="https://docs.python.org/3/asyncio.html",
            title="Asyncio in Python",
            site_name="Python Docs",
            text="Asyncio is a library to write concurrent code using the async/await syntax.",
        )
        mock_embed.return_value = 3
        mock_llm.return_value = """[
            {"name": "Asyncio Event Loop", "description": "Core concurrency mechanism in Python"},
            {"name": "Coroutines", "description": "Functions defined with async def"}
        ]"""

        res = self.client.post(
            "/api/sources/website/import",
            json={
                "url": "https://docs.python.org/3/asyncio.html",
                "workspace_id": self.workspace.id,
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            topics = (await session.execute(
                select(Topic).where(Topic.workspace_id == self.workspace.id)
            )).scalars().all()
            topic_names = {t.name for t in topics}
            self.assertIn("Asyncio Event Loop", topic_names)
            self.assertIn("Coroutines", topic_names)

    @patch("app.routes.sources.github.fetch_github_repo")
    @patch("app.services.embedding_service.index_code_chunks")
    @patch("app.services.llm_service.generate_text")
    async def test_github_source_creates_topics(self, mock_llm, mock_embed, mock_fetch_repo):
        """Verify GitHub repository import automatically extracts and creates workspace topics."""
        mock_fetch_repo.return_value = RepoResult(
            index_key="gh_fastapi_repo",
            owner="tiangolo",
            repo="fastapi",
            branch="master",
            files=[],
            chunks=[CodeChunk(text="class FastAPI: pass", file_path="main.py", language="python", chunk_type="class", line_start=1, line_end=10)],
            text="FastAPI framework, high performance, easy to learn, fast to code, ready for production.",
            file_tree=[],
        )
        mock_embed.return_value = 6
        mock_llm.return_value = """[
            {"name": "FastAPI Dependency Injection", "description": "Reusable dependencies in routes"},
            {"name": "Pydantic Validation", "description": "Data parsing and validation"}
        ]"""

        res = self.client.post(
            "/api/sources/github/import",
            json={
                "url": "https://github.com/tiangolo/fastapi",
                "workspace_id": self.workspace.id,
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            topics = (await session.execute(
                select(Topic).where(Topic.workspace_id == self.workspace.id)
            )).scalars().all()
            topic_names = {t.name for t in topics}
            self.assertIn("FastAPI Dependency Injection", topic_names)
            self.assertIn("Pydantic Validation", topic_names)

    @patch("app.routes.sources.website.fetch_webpage")
    @patch("app.services.embedding_service.index_transcript")
    @patch("app.services.llm_service.generate_text")
    async def test_repeated_import_no_duplicate_topics(self, mock_llm, mock_embed, mock_fetch_web):
        """Verify importing the same content multiple times does not create duplicate topics."""
        mock_fetch_web.return_value = WebPageResult(
            url="https://example.com/database-indexes",
            title="Database Indexing Guide",
            site_name="DB Guide",
            text="B-Trees and Hash Indexes provide efficient lookup mechanisms.",
        )
        mock_embed.return_value = 2
        mock_llm.return_value = """[
            {"name": "B-Tree Indexes", "description": "Self-balancing tree data structure"}
        ]"""

        # First import
        res1 = self.client.post(
            "/api/sources/website/import",
            json={
                "url": "https://example.com/database-indexes",
                "workspace_id": self.workspace.id,
            },
            headers=self.headers,
        )
        self.assertEqual(res1.status_code, 200)

        # Second import of same content
        res2 = self.client.post(
            "/api/sources/website/import",
            json={
                "url": "https://example.com/database-indexes",
                "workspace_id": self.workspace.id,
            },
            headers=self.headers,
        )
        self.assertEqual(res2.status_code, 200)

        async with self.async_session() as session:
            topics = (await session.execute(
                select(Topic).where(
                    Topic.workspace_id == self.workspace.id,
                    Topic.name == "B-Tree Indexes",
                )
            )).scalars().all()
            self.assertEqual(len(topics), 1)

    @patch("app.routes.sources.website.fetch_webpage")
    @patch("app.services.embedding_service.index_transcript")
    @patch("app.services.llm_service.generate_text")
    async def test_extraction_failure_source_remains_consistent(self, mock_llm, mock_embed, mock_fetch_web):
        """Verify that if LLM topic extraction raises an exception, the source import succeeds."""
        mock_fetch_web.return_value = WebPageResult(
            url="https://example.com/fault-tolerance",
            title="Fault Tolerant Systems",
            site_name="Systems Guide",
            text="Fault tolerance is the property that enables a system to continue operating properly.",
        )
        mock_embed.return_value = 2
        # LLM raises an unexpected error
        mock_llm.side_effect = RuntimeError("OpenAI rate limit exceeded")

        res = self.client.post(
            "/api/sources/website/import",
            json={
                "url": "https://example.com/fault-tolerance",
                "workspace_id": self.workspace.id,
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        # Source is saved and ready
        async with self.async_session() as session:
            source = (await session.execute(
                select(Source).where(
                    Source.workspace_id == self.workspace.id,
                    Source.title == "Fault Tolerant Systems",
                )
            )).scalar_one_or_none()
            self.assertIsNotNone(source)
            self.assertEqual(source.status, "ready")

            # Fallback heuristic topic extraction should have extracted title or heading
            topics = (await session.execute(
                select(Topic).where(Topic.workspace_id == self.workspace.id)
            )).scalars().all()
            self.assertGreaterEqual(len(topics), 1)

    @patch("app.services.embedding_service.index_transcript")
    @patch("app.services.embedding_service.delete_chunks")
    @patch("app.services.llm_service.generate_text")
    async def test_move_standalone_session_creates_topics(self, mock_llm, mock_del, mock_embed):
        """Verify moving a standalone session to a workspace extracts topics for each source."""
        mock_embed.return_value = 2
        mock_llm.return_value = """[
            {"name": "Linear Regression", "description": "Fitting a linear equation to observed data"}
        ]"""

        # Setup standalone session with source
        async with self.async_session() as session:
            standalone_session = StandaloneSession(
                id="stand_sess_1",
                user_id=self.user.id,
                title="ML Chat",
            )
            session.add(standalone_session)
            standalone_source = StandaloneSource(
                id="stand_src_1",
                session_id=standalone_session.id,
                title="Regression Notes",
                source_type="text",
                content="Linear regression is a linear approach for modelling the relationship between scalar response and variables.",
                index_key="stand_key_1",
            )
            session.add(standalone_source)
            await session.commit()

        res = self.client.post(
            f"/api/standalone/sessions/stand_sess_1/move",
            json={"workspace_id": self.workspace.id},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            topics = (await session.execute(
                select(Topic).where(Topic.workspace_id == self.workspace.id)
            )).scalars().all()
            topic_names = {t.name for t in topics}
            self.assertIn("Linear Regression", topic_names)
        self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            topics = (await session.execute(
                select(Topic).where(Topic.workspace_id == self.workspace.id)
            )).scalars().all()
            topic_names = {t.name for t in topics}
            self.assertIn("Linear Regression", topic_names)


if __name__ == "__main__":
    unittest.main()
