import json
import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

from app.db_models import (
    Base,
    User,
    Workspace,
    Topic,
    TopicMastery,
    TopicPerformanceLog,
    Flashcard,
    Quiz,
    MentorSession,
    Source,
)
from app.database import get_db
from app.main import app
from app.services.auth_service import create_token, hash_password
from app.services import (
    mastery_service,
    daily_revision_service,
    progress_service,
    quiz_service,
    mentor_service,
)


class TestAdaptiveMasteryRecommendations(unittest.IsolatedAsyncioTestCase):
    """Integration tests for Adaptive Mastery driving recommendations, Daily Revision, and Progress."""

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
                id="user_test_mastery_rec",
                email="mastery_rec@example.com",
                password_hash=hash_password("password123"),
            )
            session.add(self.user)
            self.workspace = Workspace(
                id="ws_test_mastery_rec",
                owner_id=self.user.id,
                name="Mastery Recommendations Workspace",
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

    async def test_daily_revision_returns_focus_topics(self):
        """Verify Daily Revision returns focus topics computed from the Adaptive Mastery Engine."""
        async with self.async_session() as session:
            # Seed 2 topics: one weak, one unpracticed
            t1 = Topic(workspace_id=self.workspace.id, name="Deadlocks", description="Deadlock issues")
            t2 = Topic(workspace_id=self.workspace.id, name="Paging", description="Virtual memory paging")
            session.add_all([t1, t2])
            await session.commit()

            # Record incorrect performance for t1 to make it weak
            await mastery_service.record_topic_performance(
                db=session,
                user_id=self.user.id,
                workspace_id=self.workspace.id,
                topic_id=t1.id,
                item_type="flashcard",
                item_id="fc1",
                is_correct=False,
                score=0.0,
            )

        res = self.client.get(
            f"/api/ai/daily-revision/summary?workspace_id={self.workspace.id}",
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("focus_topics", data)
        focus_topics = data["focus_topics"]
        self.assertGreaterEqual(len(focus_topics), 1)

        # Check fields of focus_topics
        ft_deadlocks = next((ft for ft in focus_topics if ft["topic_name"] == "Deadlocks"), None)
        self.assertIsNotNone(ft_deadlocks)
        self.assertEqual(ft_deadlocks["status"], "weak")
        self.assertEqual(ft_deadlocks["next_recommended_action"], "Review now")
        self.assertGreater(ft_deadlocks["revision_priority"], 50.0)

    @patch("app.services.quiz_service.generate_quiz")
    async def test_weak_topic_quiz_generation_parameter(self, mock_gen_quiz):
        """Verify quiz generation passes prioritize_weak_topics to quiz generator."""
        mock_gen_quiz.return_value = [
            {
                "id": "q1",
                "type": "mcq",
                "question": "What causes deadlock?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": 0,
                "topic": "Deadlocks",
            }
        ]

        async with self.async_session() as session:
            # Seed source and weak topic
            source = Source(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                title="OS Notes",
                source_type="pdf",
                raw_text="Deadlocks and memory management concepts.",
                status="ready",
            )
            session.add(source)
            topic = Topic(workspace_id=self.workspace.id, source_id=source.id, name="Deadlocks")
            session.add(topic)
            await session.commit()
            source_id = source.id

        res = self.client.post(
            "/api/ai/quiz/generate",
            json={
                "source_id": source_id,
                "quiz_type": "mcq",
                "count": 3,
                "prioritize_weak_topics": True,
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 201)
        mock_gen_quiz.assert_called_once()
        # Verify focus_topics was passed with weak topics
        call_kwargs = mock_gen_quiz.call_args.kwargs
        self.assertIn("focus_topics", call_kwargs)

    async def test_flashcard_completion_refreshes_mastery_and_recommendation(self):
        """Verify flashcard review updates TopicMastery and changes recommendation."""
        async with self.async_session() as session:
            topic = Topic(workspace_id=self.workspace.id, name="CPU Scheduling")
            session.add(topic)
            await session.commit()

            fc = Flashcard(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                topic_id=topic.id,
                question="What is Round Robin?",
                answer="Time-sliced scheduling algorithm.",
                difficulty="medium",
            )
            session.add(fc)
            await session.commit()
            fc_id = fc.id
            topic_id = topic.id

        # 1. First review: Failed -> Status = weak, Action = "Review now"
        res1 = self.client.post(f"/api/ai/flashcards/{fc_id}/review", json={"rating": 0}, headers=self.headers)
        self.assertEqual(res1.status_code, 200)

        async with self.async_session() as session:
            masteries = await mastery_service.get_workspace_topic_masteries(session, self.workspace.id, self.user.id)
            sched_topic = next((m for m in masteries if m.topic_id == topic_id), None)
            self.assertIsNotNone(sched_topic)
            self.assertEqual(sched_topic.status, "weak")
            self.assertEqual(sched_topic.next_recommended_action, "Review now")

        # 2. Subsequent 4 correct reviews -> Status improves, Recommendation changes
        for _ in range(4):
            res = self.client.post(f"/api/ai/flashcards/{fc_id}/review", json={"rating": 3}, headers=self.headers)
            self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            masteries = await mastery_service.get_workspace_topic_masteries(session, self.workspace.id, self.user.id)
            sched_topic = next((m for m in masteries if m.topic_id == topic_id), None)
            self.assertIsNotNone(sched_topic)
            self.assertIn(sched_topic.status, ("strong", "mastered"))
            self.assertNotEqual(sched_topic.next_recommended_action, "Review now")

            # Verify progress dashboard also returns the updated mastery
            dashboard = await progress_service.build_dashboard(session, self.workspace.id, self.user.id)
            d_topic = next((t for t in dashboard["topic_mastery"] if t["topic_id"] == topic_id), None)
            self.assertIsNotNone(d_topic)
            self.assertGreater(d_topic["mastery_score"], 60.0)

    async def test_quiz_completion_refreshes_mastery_in_progress_and_daily_revision(self):
        """Verify quiz submission updates TopicMastery and is reflected in Daily Revision & Progress."""
        async with self.async_session() as session:
            topic = Topic(workspace_id=self.workspace.id, name="Memory Management")
            session.add(topic)

            quiz = Quiz(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                title="Memory Quiz",
                quiz_type="mcq",
                questions=json.dumps([
                    {
                        "id": "q1",
                        "type": "mcq",
                        "question": "What is TLB?",
                        "options": ["Translation Lookaside Buffer", "Total Log Buffer", "Track Level Bit", "None"],
                        "correct_answer": 0,
                        "topic": "Memory Management",
                    }
                ]),
                max_score=1,
            )
            session.add(quiz)
            await session.commit()
            quiz_id = quiz.id
            topic_id = topic.id

        # Submit correct answer
        res = self.client.post(
            f"/api/ai/quiz/{quiz_id}/submit",
            json={"answers": [{"question_id": "q1", "answer": 0}]},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            # Check Daily Revision summary
            rev_summary = await daily_revision_service.build_revision_summary(session, self.workspace.id, self.user.id)
            self.assertIn("focus_topics", rev_summary)

            # Check Progress dashboard
            dashboard = await progress_service.build_dashboard(session, self.workspace.id, self.user.id)
            d_topic = next((t for t in dashboard["topic_mastery"] if t["topic_id"] == topic_id), None)
            self.assertIsNotNone(d_topic)
            self.assertEqual(d_topic["correct_attempts"], 1)
            self.assertEqual(d_topic["total_attempts"], 1)

    @patch("app.services.llm_service.generate_text")
    async def test_mentor_completion_refreshes_mastery(self, mock_llm):
        """Verify mentor response evaluates answer and updates TopicMastery."""
        mock_llm.return_value = json.dumps({
            "evaluation": "correct",
            "follow_up_question": "What is a mutex?",
            "explanation": "Great explanation of semaphores.",
            "correct_answer": "Semaphore is a signaling mechanism.",
            "assessment": "strong",
        })

        async with self.async_session() as session:
            topic = Topic(workspace_id=self.workspace.id, name="Synchronization")
            session.add(topic)
            await session.commit()

            mentor_sess = MentorSession(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                topic="Synchronization",
                topic_id=topic.id,
                status="active",
                messages=json.dumps([{"role": "ai", "content": "What is a semaphore?", "evaluation": None}]),
            )
            session.add(mentor_sess)
            await session.commit()
            sess_id = mentor_sess.id
            topic_id = topic.id

        res = self.client.post(
            "/api/ai/mentor/respond",
            json={
                "session_id": sess_id,
                "answer": "A semaphore is a synchronization primitive that controls access to a shared resource.",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        async with self.async_session() as session:
            mastery = (await session.execute(
                select(TopicMastery).where(
                    TopicMastery.user_id == self.user.id,
                    TopicMastery.topic_id == topic_id,
                )
            )).scalar_one_or_none()
            self.assertIsNotNone(mastery)
            self.assertEqual(mastery.total_attempts, 1)
            self.assertEqual(mastery.correct_attempts, 1)
            self.assertEqual(mastery.consecutive_correct, 1)
