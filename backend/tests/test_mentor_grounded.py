import json
import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.db_models import Base, User, Workspace, Topic, TopicMastery, TopicPerformanceLog, MentorSession, Source, SourceChunk
from app.database import get_db
from app.main import app
from app.services.auth_service import create_token, hash_password
from app.services import mentor_service, mastery_service


class TestMentorGroundedSystem(unittest.IsolatedAsyncioTestCase):
    """Comprehensive test suite for Source-Grounded Adaptive Mentor system."""

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

        async def override_get_db():
            async with self.async_session() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Seed test users
        async with self.async_session() as session:
            self.user = User(
                email="learner@scritur.space",
                password_hash=hash_password("password123"),
            )
            self.other_user = User(
                email="stranger@scritur.space",
                password_hash=hash_password("password123"),
            )
            session.add(self.user)
            session.add(self.other_user)
            await session.commit()
            await session.refresh(self.user)
            await session.refresh(self.other_user)

            self.workspace = Workspace(
                name="Systems Programming",
                owner_id=self.user.id,
            )
            session.add(self.workspace)
            await session.commit()
            await session.refresh(self.workspace)

            # Seed a source with text chunks in the workspace
            self.source = Source(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                source_type="text_note",
                title="Operating System Concurrency",
                raw_text="Deadlocks occur when four Coffman conditions are met: mutual exclusion, hold and wait, no preemption, and circular wait.",
                status="ready",
            )
            session.add(self.source)
            await session.commit()
            await session.refresh(self.source)

            self.chunk = SourceChunk(
                source_id=self.source.id,
                chunk_index=0,
                text="Deadlocks occur when four Coffman conditions are met: mutual exclusion, hold and wait, no preemption, and circular wait.",
            )
            session.add(self.chunk)
            await session.commit()

            self.token = create_token(self.user.id)
            self.headers = {"Authorization": f"Bearer {self.token}"}

            self.other_token = create_token(self.other_user.id)
            self.other_headers = {"Authorization": f"Bearer {self.other_token}"}

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await self.engine.dispose()

    @patch("app.services.llm_service.generate_text")
    async def test_mentor_topic_association_and_grounding(self, mock_llm):
        """Verify mentor session is linked to Topic model and retrieves workspace grounding context."""
        mock_llm.return_value = '{"follow_up_question": "Can you explain the Coffman conditions for deadlocks?"}'

        res = self.client.post(
            "/api/ai/mentor/start",
            json={
                "workspace_id": self.workspace.id,
                "topic": "Deadlocks",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        session_data = data["session"]

        self.assertIsNotNone(session_data.get("topic_id"))
        self.assertEqual(session_data["topic"], "Deadlocks")
        self.assertEqual(data["first_question"], "Can you explain the Coffman conditions for deadlocks?")

        # Check prompt grounding
        prompt_arg = mock_llm.call_args[0][0]
        self.assertIn("Operating System Concurrency", prompt_arg)
        self.assertIn("Coffman conditions", prompt_arg)

        # Check database persistence
        async with self.async_session() as session:
            ms = (await session.execute(
                select(MentorSession).where(MentorSession.id == session_data["id"])
            )).scalar_one_or_none()
            self.assertIsNotNone(ms)
            self.assertIsNotNone(ms.topic_id)
            self.assertEqual(ms.topic, "Deadlocks")

    @patch("app.services.llm_service.generate_text")
    async def test_mentor_mastery_updates_correct_partial_incorrect(self, mock_llm):
        """Verify evaluations (correct, partial, incorrect) update topic mastery in Adaptive Mastery Engine."""
        # 1. Start session
        mock_llm.return_value = '{"follow_up_question": "What is mutual exclusion?"}'
        start_res = self.client.post(
            "/api/ai/mentor/start",
            json={"workspace_id": self.workspace.id, "topic": "Concurrency Controls"},
            headers=self.headers,
        )
        self.assertEqual(start_res.status_code, 201)
        session_id = start_res.json()["session"]["id"]
        topic_id = start_res.json()["session"]["topic_id"]

        # 2. Correct evaluation -> mastery increases
        mock_llm.return_value = json.dumps({
            "evaluation": "correct",
            "explanation": "Spot on. Only one process can hold the resource at a time.",
            "follow_up_question": "What is hold and wait?",
            "assessment": "mastered",
        })
        resp1 = self.client.post(
            "/api/ai/mentor/respond",
            json={"session_id": session_id, "answer": "Mutual exclusion means non-shareable resources."},
            headers=self.headers,
        )
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json()["evaluation"], "correct")

        async with self.async_session() as session:
            mastery = (await session.execute(
                select(TopicMastery).where(TopicMastery.topic_id == topic_id, TopicMastery.user_id == self.user.id)
            )).scalar_one_or_none()
            self.assertIsNotNone(mastery)
            self.assertEqual(mastery.correct_attempts, 1)
            self.assertEqual(mastery.total_attempts, 1)
            self.assertEqual(mastery.consecutive_correct, 1)

        # 3. Partial evaluation -> records partial score (0.5)
        mock_llm.return_value = json.dumps({
            "evaluation": "partial",
            "explanation": "You mentioned holding resources, but omitted requesting new ones.",
            "follow_up_question": "What about circular wait?",
            "assessment": "needs_practice",
        })
        resp2 = self.client.post(
            "/api/ai/mentor/respond",
            json={"session_id": session_id, "answer": "Processes keep holding their items."},
            headers=self.headers,
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["evaluation"], "partial")

        async with self.async_session() as session:
            logs = (await session.execute(
                select(TopicPerformanceLog).where(TopicPerformanceLog.topic_id == topic_id).order_by(TopicPerformanceLog.created_at.desc())
            )).scalars().all()
            self.assertEqual(len(logs), 2)
            self.assertEqual(logs[0].score, 0.5)

        # 4. Incorrect evaluation -> failure streak & priority increases
        mock_llm.return_value = json.dumps({
            "evaluation": "incorrect",
            "explanation": "Circular wait requires a closed loop of dependent processes.",
            "follow_up_question": "Let's review circular wait again.",
            "assessment": "struggling",
        })
        resp3 = self.client.post(
            "/api/ai/mentor/respond",
            json={"session_id": session_id, "answer": "It means the CPU clock rotates around."},
            headers=self.headers,
        )
        self.assertEqual(resp3.status_code, 200)
        self.assertEqual(resp3.json()["evaluation"], "incorrect")

        async with self.async_session() as session:
            mastery3 = (await session.execute(
                select(TopicMastery).where(TopicMastery.topic_id == topic_id, TopicMastery.user_id == self.user.id)
            )).scalar_one_or_none()
            self.assertEqual(mastery3.total_attempts, 3)
            self.assertEqual(mastery3.consecutive_incorrect, 1)

    @patch("app.services.llm_service.generate_text")
    async def test_weak_topics_endpoint_and_quick_start(self, mock_llm):
        """Verify GET /api/ai/mentor/weak-topics returns weak focus areas."""
        # Record poor performance on a topic
        async with self.async_session() as session:
            topic = await mastery_service.get_or_create_topic_by_name(
                session, self.workspace.id, "Virtual Memory Paging"
            )
            await mastery_service.record_topic_performance(
                session, self.user.id, self.workspace.id, topic.id, "flashcard", "fc_1", False, 0.0
            )
            await mastery_service.record_topic_performance(
                session, self.user.id, self.workspace.id, topic.id, "flashcard", "fc_2", False, 0.0
            )

        res = self.client.get(
            f"/api/ai/mentor/weak-topics?workspace_id={self.workspace.id}",
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        weak_topics = res.json()
        self.assertGreaterEqual(len(weak_topics), 1)
        self.assertEqual(weak_topics[0]["topic_name"], "Virtual Memory Paging")
        self.assertEqual(weak_topics[0]["status"], "weak")

    @patch("app.services.llm_service.generate_text")
    async def test_insufficient_source_context_handling(self, mock_llm):
        """Verify prompt informs AI and fallback provides clear message when workspace lacks source info."""
        mock_llm.return_value = ""  # Simulate empty response triggering fallback

        res = self.client.post(
            "/api/ai/mentor/start",
            json={
                "workspace_id": self.workspace.id,
                "topic": "Quantum Computing Mechanics",  # Not in workspace sources
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 201)
        first_q = res.json()["first_question"]
        self.assertIn("study material", first_q.lower())

    @patch("app.services.llm_service.generate_text")
    async def test_malformed_llm_json_recovery(self, mock_llm):
        """Verify that malformed/non-JSON LLM responses do not prematurely terminate the session."""
        # 1. Start session
        mock_llm.return_value = '{"follow_up_question": "Explain semaphores."}'
        start_res = self.client.post(
            "/api/ai/mentor/start",
            json={"workspace_id": self.workspace.id, "topic": "Semaphores"},
            headers=self.headers,
        )
        session_id = start_res.json()["session"]["id"]

        # 2. LLM returns non-JSON raw text
        mock_llm.return_value = "This is a great explanation, but remember semaphores use wait() and signal()."
        resp = self.client.post(
            "/api/ai/mentor/respond",
            json={"session_id": session_id, "answer": "Semaphores are integer variables used for signaling."},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        resp_data = resp.json()

        # Crucial: session must NOT be terminated
        self.assertFalse(resp_data["session_complete"])
        self.assertIsNotNone(resp_data["follow_up_question"])

    async def test_workspace_authorization_guards(self):
        """Verify non-workspace users are rejected with 404 when unauthorized."""
        # Create session as legitimate user
        async with self.async_session() as session:
            topic = await mastery_service.get_or_create_topic_by_name(
                session, self.workspace.id, "Mutex Locks"
            )
            ms = MentorSession(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                topic_id=topic.id,
                topic="Mutex Locks",
                messages="[]",
                status="active",
            )
            session.add(ms)
            await session.commit()
            await session.refresh(ms)
            session_id = ms.id

        # Stranger attempts /weak-topics
        res1 = self.client.get(
            f"/api/ai/mentor/weak-topics?workspace_id={self.workspace.id}",
            headers=self.other_headers,
        )
        self.assertEqual(res1.status_code, 404)

        # Stranger attempts /start in user's workspace
        res2 = self.client.post(
            "/api/ai/mentor/start",
            json={"workspace_id": self.workspace.id, "topic": "Mutex Locks"},
            headers=self.other_headers,
        )
        self.assertEqual(res2.status_code, 404)

        # Stranger attempts /respond to user's session
        res3 = self.client.post(
            "/api/ai/mentor/respond",
            json={"session_id": session_id, "answer": "Hack"},
            headers=self.other_headers,
        )
        self.assertEqual(res3.status_code, 404)

        # Stranger attempts /end
        res4 = self.client.post(
            f"/api/ai/mentor/{session_id}/end",
            headers=self.other_headers,
        )
        self.assertEqual(res4.status_code, 404)


if __name__ == "__main__":
    unittest.main()
