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
)
from app.database import get_db
from app.main import app
from app.services.auth_service import create_token, hash_password
from app.services import mastery_service, quiz_service, mentor_service


class TestAdaptiveMasteryActivities(unittest.IsolatedAsyncioTestCase):
    """Integration tests for Flashcards, Quizzes, and Mentor feeding the Adaptive Mastery Engine."""

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
                id="user_test_mastery_act",
                email="mastery_act@example.com",
                password_hash=hash_password("password123"),
            )
            session.add(self.user)
            self.workspace = Workspace(
                id="ws_test_mastery_act",
                owner_id=self.user.id,
                name="Adaptive Mastery Workspace",
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

    async def test_topic_normalization_and_deduplication(self):
        """Verify topic matching prevents duplicate variations (plural, case, punctuation)."""
        async with self.async_session() as session:
            # Create base topic "Deadlocks"
            top1 = await mastery_service.get_or_create_topic_by_name(
                session, self.workspace.id, "Deadlocks", description="Deadlock conditions"
            )
            self.assertEqual(top1.name, "Deadlocks")

            # Try to get or create "Deadlock" (singular)
            top2 = await mastery_service.get_or_create_topic_by_name(
                session, self.workspace.id, "Deadlock"
            )
            self.assertEqual(top1.id, top2.id, "Singular 'Deadlock' should match existing 'Deadlocks'")

            # Try case variation "deadlocks"
            top3 = await mastery_service.get_or_create_topic_by_name(
                session, self.workspace.id, "deadlocks"
            )
            self.assertEqual(top1.id, top3.id, "Case-insensitive 'deadlocks' should match")

            # Check sync_topics_for_source with plural variations
            synced = await mastery_service.sync_topics_for_source(
                session,
                self.workspace.id,
                None,
                [
                    {"name": "Deadlock", "description": "Single deadlock"},
                    {"name": "Process Scheduling", "description": "CPU scheduler"},
                ],
            )
            self.assertEqual(len(synced), 2)
            self.assertEqual(synced[0].id, top1.id)

            # Query all topics in workspace, there should only be 2 (Deadlocks, Process Scheduling)
            all_topics = (await session.execute(
                select(Topic).where(Topic.workspace_id == self.workspace.id)
            )).scalars().all()
            self.assertEqual(len(all_topics), 2)

    async def test_manual_flashcard_creation_auto_associates_topic(self):
        """Verify manual flashcard creation without explicit topic_id auto-associates with workspace topic."""
        async with self.async_session() as session:
            # Seed a topic
            t = Topic(
                workspace_id=self.workspace.id,
                name="Virtual Memory",
                description="Paging and segmentation",
            )
            session.add(t)
            await session.commit()

        # Create flashcard mentioning Virtual Memory in question
        res = self.client.post(
            "/api/ai/flashcards/",
            json={
                "workspace_id": self.workspace.id,
                "question": "What is page fault in Virtual Memory?",
                "answer": "An interrupt when accessing unmapped page.",
                "difficulty": "medium",
                "tags": [],
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIsNotNone(data["topic_id"])

        async with self.async_session() as session:
            fc = (await session.execute(
                select(Flashcard).where(Flashcard.id == data["id"])
            )).scalar_one()
            self.assertIsNotNone(fc.topic_id)

    async def test_flashcard_review_auto_associates_topic_and_records_mastery(self):
        """Verify reviewing a flashcard with topic_id=None resolves topic and records mastery."""
        async with self.async_session() as session:
            # Create a flashcard directly with topic_id=None
            fc = Flashcard(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                question="What is a semaphore?",
                answer="A synchronization variable.",
                difficulty="hard",
                tags=json.dumps(["Concurrency"]),
            )
            session.add(fc)
            await session.commit()
            fc_id = fc.id

        # Review the flashcard (rating 2 = good / correct)
        res = self.client.post(
            f"/api/ai/flashcards/{fc_id}/review",
            json={"rating": 2},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        # Verify topic was assigned and performance log + mastery were recorded
        async with self.async_session() as session:
            fc_updated = (await session.execute(
                select(Flashcard).where(Flashcard.id == fc_id)
            )).scalar_one()
            self.assertIsNotNone(fc_updated.topic_id)

            # Check TopicPerformanceLog
            logs = (await session.execute(
                select(TopicPerformanceLog).where(
                    TopicPerformanceLog.user_id == self.user.id,
                    TopicPerformanceLog.item_id == fc_id,
                )
            )).scalars().all()
            self.assertEqual(len(logs), 1)
            self.assertEqual(logs[0].is_correct, 1)
            self.assertEqual(logs[0].score, 1.0)

            # Check TopicMastery
            mastery = (await session.execute(
                select(TopicMastery).where(
                    TopicMastery.user_id == self.user.id,
                    TopicMastery.topic_id == fc_updated.topic_id,
                )
            )).scalar_one_or_none()
            self.assertIsNotNone(mastery)
            self.assertEqual(mastery.total_attempts, 1)
            self.assertEqual(mastery.correct_attempts, 1)
            self.assertEqual(mastery.consecutive_correct, 1)

    async def test_quiz_deduplicates_topics_and_records_performance(self):
        """Verify quiz submission resolves question topic to existing normalized topic and records mastery."""
        async with self.async_session() as session:
            # Pre-existing topic: "Deadlocks"
            existing_topic = Topic(
                workspace_id=self.workspace.id,
                name="Deadlocks",
                description="Resource allocation graph",
            )
            session.add(existing_topic)

            # Create a quiz where question topic is "Deadlock" (singular)
            quiz = Quiz(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                title="OS Quiz",
                quiz_type="mcq",
                questions=json.dumps([
                    {
                        "id": "q1",
                        "type": "mcq",
                        "question": "Which is not a Coffman condition?",
                        "options": ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"],
                        "correct_answer": 2,
                        "topic": "Deadlock",
                    }
                ]),
                max_score=1,
            )
            session.add(quiz)
            await session.commit()
            quiz_id = quiz.id
            existing_topic_id = existing_topic.id

        # Submit quiz with correct answer (index 2)
        res = self.client.post(
            f"/api/ai/quiz/{quiz_id}/submit",
            json={"answers": [{"question_id": "q1", "answer": 2}]},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["score"], 1)

        # Verify only 1 topic exists and performance log is attached to existing_topic_id
        async with self.async_session() as session:
            all_topics = (await session.execute(
                select(Topic).where(Topic.workspace_id == self.workspace.id)
            )).scalars().all()
            self.assertEqual(len(all_topics), 1)
            self.assertEqual(all_topics[0].id, existing_topic_id)

            logs = (await session.execute(
                select(TopicPerformanceLog).where(
                    TopicPerformanceLog.user_id == self.user.id,
                    TopicPerformanceLog.topic_id == existing_topic_id,
                )
            )).scalars().all()
            self.assertEqual(len(logs), 1)
            self.assertEqual(logs[0].is_correct, 1)

    @patch("app.services.llm_service.generate_text")
    async def test_non_mcq_quiz_grading_with_llm_and_fallback(self, mock_llm):
        """Verify non-MCQ quiz questions are graded via LLM and fallback heuristic."""
        # 1. LLM evaluation test
        mock_llm.return_value = json.dumps({
            "score": 0.85,
            "is_correct": True,
            "feedback": "Good explanation covering page replacement concepts.",
        })

        questions = [
            {
                "id": "q1",
                "type": "short_answer",
                "question": "Explain LRU page replacement.",
                "expected_answer": "Least recently used page is chosen for eviction.",
                "key_points": ["least recently used", "eviction"],
                "topic": "Memory Management",
            }
        ]
        answers = [{"question_id": "q1", "answer": "LRU replaces the page that was least recently accessed in memory."}]

        score, max_score, details = await quiz_service.score_quiz_async(questions, answers)
        self.assertEqual(score, 1)
        self.assertEqual(max_score, 1)
        self.assertTrue(details[0]["is_correct"])
        self.assertEqual(details[0]["score"], 0.85)

        # 2. Fallback heuristic test (when LLM throws error)
        mock_llm.side_effect = Exception("LLM temporary error")
        score_fb, max_fb, details_fb = await quiz_service.score_quiz_async(questions, answers)
        self.assertEqual(score_fb, 1)
        self.assertTrue(details_fb[0]["is_correct"])
        self.assertGreater(details_fb[0]["score"], 0.0)

    async def test_mentor_partial_answer_does_not_increment_consecutive_correct(self):
        """Verify partial answers (score = 0.5) do not increment consecutive_correct streak."""
        async with self.async_session() as session:
            topic = Topic(
                workspace_id=self.workspace.id,
                name="Distributed Consensus",
                description="Raft and Paxos",
            )
            session.add(topic)
            await session.commit()
            topic_id = topic.id

            # 1. Record a full correct answer (score = 1.0)
            m1 = await mastery_service.record_topic_performance(
                db=session,
                user_id=self.user.id,
                workspace_id=self.workspace.id,
                topic_id=topic_id,
                item_type="mentor",
                item_id="sess_1",
                is_correct=True,
                score=1.0,
            )
            self.assertEqual(m1.total_attempts, 1)
            self.assertEqual(m1.correct_attempts, 1)
            self.assertEqual(m1.consecutive_correct, 1)

            # 2. Record a partial answer (score = 0.5, is_correct = True)
            m2 = await mastery_service.record_topic_performance(
                db=session,
                user_id=self.user.id,
                workspace_id=self.workspace.id,
                topic_id=topic_id,
                item_type="mentor",
                item_id="sess_2",
                is_correct=True,
                score=0.5,
            )
            self.assertEqual(m2.total_attempts, 2)
            self.assertEqual(m2.correct_attempts, 2)
            self.assertEqual(m2.consecutive_correct, 0, "Partial answer must not increment consecutive_correct streak")
            self.assertEqual(m2.consecutive_incorrect, 0)

            # 3. Record another full correct answer (score = 1.0)
            m3 = await mastery_service.record_topic_performance(
                db=session,
                user_id=self.user.id,
                workspace_id=self.workspace.id,
                topic_id=topic_id,
                item_type="mentor",
                item_id="sess_3",
                is_correct=True,
                score=1.0,
            )
            self.assertEqual(m3.total_attempts, 3)
            self.assertEqual(m3.correct_attempts, 3)
            self.assertEqual(m3.consecutive_correct, 1)
