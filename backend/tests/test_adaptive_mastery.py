import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.db_models import Base, User, Workspace, Topic, TopicMastery, TopicPerformanceLog, Flashcard, Quiz
from app.database import get_db
from app.main import app
from app.services.auth_service import create_token, hash_password
from app.services.mastery_service import (
    calculate_mastery_metrics,
    extract_topics_from_text,
    sync_topics_for_source,
    get_or_create_topic_by_name,
    record_topic_performance,
    get_workspace_topic_masteries,
    get_weak_focus_areas,
    get_topic_details,
)
from app.models import (
    TopicResponse,
    TopicMasteryResponse,
    TopicDetailResponse,
    GenerateQuizRequest,
    SubmitQuizAnswer,
    SubmitQuizRequest,
)


class TestMasteryCalculations(unittest.TestCase):
    """Test pure deterministic mastery calculation math."""

    def test_initial_state_zero_attempts(self):
        score, status, priority, action = calculate_mastery_metrics(
            total_attempts=0,
            correct_attempts=0,
            consecutive_correct=0,
            consecutive_incorrect=0,
        )
        self.assertEqual(score, 0.0)
        self.assertEqual(status, "learning")
        self.assertEqual(priority, 100.0)
        self.assertEqual(action, "Practice")

    def test_single_correct_attempt_confidence_scaling(self):
        # 1 attempt correct: accuracy=1.0, confidence=1/4=0.25 -> base=25.0
        score, status, priority, action = calculate_mastery_metrics(
            total_attempts=1,
            correct_attempts=1,
            consecutive_correct=1,
            consecutive_incorrect=0,
            recent_scores=[1.0],
        )
        self.assertEqual(score, 25.0)
        self.assertEqual(status, "weak")  # < 50% is weak
        self.assertGreater(priority, 70.0)

    def test_progression_to_strong_and_mastered(self):
        # 4 consecutive correct attempts: confidence = 1.0, streak bonus (4-2)*3 = +6
        # base = 100 * 1.0 + 6 = 106 -> clamped to 100.0
        score, status, priority, action = calculate_mastery_metrics(
            total_attempts=4,
            correct_attempts=4,
            consecutive_correct=4,
            consecutive_incorrect=0,
            recent_scores=[1.0, 1.0, 1.0, 1.0],
        )
        self.assertEqual(score, 100.0)
        self.assertEqual(status, "mastered")
        self.assertEqual(action, "Mastered")
        self.assertLessEqual(priority, 10.0)

    def test_consecutive_incorrect_streak_penalty(self):
        # Learner previously had high score, now fails 3 in a row
        recent_scores = [1.0, 1.0, 1.0, 0.0, 0.0, 0.0]
        score, status, priority, action = calculate_mastery_metrics(
            total_attempts=6,
            correct_attempts=3,
            consecutive_correct=0,
            consecutive_incorrect=3,
            recent_scores=recent_scores,
        )
        # Score is reduced by penalty: -6 * (3 - 1) = -12
        self.assertLess(score, 50.0)
        self.assertEqual(status, "weak")
        # Priority should be amplified: (100 - score) * (1 + 0.25 * 3) = (100 - score) * 1.75
        self.assertGreater(priority, 90.0)
        self.assertEqual(action, "Review now")

    def test_recency_weighting_adaptation(self):
        # Learner struggled initially (0.0, 0.0) but mastered recently (1.0, 1.0, 1.0, 1.0)
        # 4/6 total accuracy = 66.7%, but recency weighted should be significantly higher
        recent_scores = [0.0, 0.0, 1.0, 1.0, 1.0, 1.0]
        score, status, priority, action = calculate_mastery_metrics(
            total_attempts=6,
            correct_attempts=4,
            consecutive_correct=4,
            consecutive_incorrect=0,
            recent_scores=recent_scores,
        )
        self.assertGreater(score, 75.0)
        self.assertIn(status, ["strong", "mastered"])


class TestMasterySchema(unittest.TestCase):
    """Test database tables and Pydantic schemas."""

    def test_tables_registered_in_metadata(self):
        table_names = set(Base.metadata.tables.keys())
        self.assertIn("topics", table_names)
        self.assertIn("topic_mastery", table_names)
        self.assertIn("topic_performance_logs", table_names)
        self.assertIn("flashcards", table_names)

    def test_generate_quiz_request_prioritize_weak_topics(self):
        req = GenerateQuizRequest(source_id="src_1", prioritize_weak_topics=True, count=10)
        self.assertTrue(req.prioritize_weak_topics)
        self.assertEqual(req.count, 10)

    def test_submit_quiz_answer_topic_metadata(self):
        answer = SubmitQuizAnswer(
            question_id="q1",
            answer=2,
            topic="Database Normalization",
        )
        self.assertEqual(answer.question_id, "q1")
        self.assertEqual(answer.answer, 2)
        self.assertEqual(answer.topic, "Database Normalization")


class TestAdaptiveMasteryEngineFlows(unittest.IsolatedAsyncioTestCase):
    """Test full async database lifecycle for Adaptive Mastery Engine."""

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

        # Seed test user and workspace
        async with self.async_session() as session:
            self.user = User(
                email="learner@scritur.space",
                password_hash=hash_password("password123"),
            )
            session.add(self.user)
            await session.commit()
            await session.refresh(self.user)

            self.workspace = Workspace(
                name="Computer Science 101",
                owner_id=self.user.id,
            )
            session.add(self.workspace)
            await session.commit()
            await session.refresh(self.workspace)

            self.token = create_token(self.user.id)
            self.headers = {"Authorization": f"Bearer {self.token}"}

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await self.engine.dispose()

    async def test_topic_sync_and_deduplication(self):
        """Verify topics are created and synced without duplicates in a workspace."""
        async with self.async_session() as session:
            topics_data = [
                {"name": "Deadlocks", "description": "Resource contention in operating systems"},
                {"name": "Virtual Memory", "description": "Paging and segmentation"},
                {"name": "deadlocks", "description": "Duplicate casing"},
            ]
            synced = await sync_topics_for_source(
                session, self.workspace.id, "source_1", topics_data
            )
            self.assertEqual(len(synced), 3)

            # Check distinct topics in DB
            all_topics = await get_workspace_topic_masteries(
                session, self.workspace.id, self.user.id
            )
            topic_names = [t.topic_name for t in all_topics]
            self.assertIn("Deadlocks", topic_names)
            self.assertIn("Virtual Memory", topic_names)
            # Duplicate name "deadlocks" should map to the existing record
            self.assertEqual(len(all_topics), 2)

    async def test_performance_recording_and_mastery_transitions(self):
        """Verify performance recording updates mastery score, status, and log rows."""
        async with self.async_session() as session:
            topic = await get_or_create_topic_by_name(
                session, self.workspace.id, "Cache Coherence"
            )

            # 1. First attempt: correct
            mastery1 = await record_topic_performance(
                session, self.user.id, self.workspace.id, topic.id, "flashcard", "fc_1", True, 1.0
            )
            self.assertEqual(mastery1.total_attempts, 1)
            self.assertEqual(mastery1.correct_attempts, 1)
            self.assertEqual(mastery1.consecutive_correct, 1)
            self.assertEqual(mastery1.consecutive_incorrect, 0)
            self.assertEqual(mastery1.status, "weak")  # 1 attempt = 25% mastery (confidence factor)

            # 2. Successive correct attempts to reach strong
            await record_topic_performance(
                session, self.user.id, self.workspace.id, topic.id, "quiz", "q_1", True, 1.0
            )
            await record_topic_performance(
                session, self.user.id, self.workspace.id, topic.id, "quiz", "q_2", True, 1.0
            )
            mastery3 = await record_topic_performance(
                session, self.user.id, self.workspace.id, topic.id, "flashcard", "fc_2", True, 1.0
            )
            self.assertEqual(mastery3.total_attempts, 4)
            self.assertEqual(mastery3.correct_attempts, 4)
            self.assertEqual(mastery3.status, "mastered")
            self.assertGreaterEqual(mastery3.mastery_score, 90.0)

            # 3. Learner fails twice consecutively -> status becomes 'weak' and priority jumps
            await record_topic_performance(
                session, self.user.id, self.workspace.id, topic.id, "quiz", "q_3", False, 0.0
            )
            mastery5 = await record_topic_performance(
                session, self.user.id, self.workspace.id, topic.id, "flashcard", "fc_3", False, 0.0
            )
            self.assertEqual(mastery5.consecutive_incorrect, 2)
            self.assertEqual(mastery5.status, "weak")
            self.assertGreater(mastery5.revision_priority, 60.0)
            self.assertEqual(mastery5.next_recommended_action, "Review now")

    async def test_progress_topic_endpoints_and_details(self):
        """Test GET /api/ai/progress/topics and GET /api/ai/progress/topics/{topic_id}/details."""
        async with self.async_session() as session:
            topic = await get_or_create_topic_by_name(
                session, self.workspace.id, "Binary Search Trees", description="Balanced and unbalanced trees"
            )
            # Create a related flashcard with user_id
            fc = Flashcard(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                topic_id=topic.id,
                question="What is the lookup time complexity of a balanced BST?",
                answer="O(log n)",
                difficulty="medium",
                tags=f'["{topic.name}"]',
            )
            session.add(fc)
            await session.commit()

            # Record an interaction
            await record_topic_performance(
                session, self.user.id, self.workspace.id, topic.id, "flashcard", fc.id, True, 1.0
            )

        # 1. Fetch workspace topic masteries via API
        res = self.client.get(
            f"/api/ai/progress/topics?workspace_id={self.workspace.id}",
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["topic_name"], "Binary Search Trees")
        self.assertEqual(data[0]["total_attempts"], 1)

        # 2. Fetch topic details drilldown
        topic_id = data[0]["topic_id"]
        detail_res = self.client.get(
            f"/api/ai/progress/topics/{topic_id}/details",
            headers=self.headers,
        )
        self.assertEqual(detail_res.status_code, 200)
        detail_data = detail_res.json()
        self.assertEqual(detail_data["topic"]["topic_name"], "Binary Search Trees")
        self.assertEqual(len(detail_data["related_flashcards"]), 1)
        self.assertEqual(detail_data["related_flashcards"][0]["question"], "What is the lookup time complexity of a balanced BST?")
        self.assertEqual(len(detail_data["recent_performance"]), 1)
        self.assertTrue(detail_data["recent_performance"][0]["is_correct"])

    async def test_flashcard_review_updates_mastery(self):
        """Verify reviewing a flashcard updates its topic mastery score automatically."""
        async with self.async_session() as session:
            topic = await get_or_create_topic_by_name(
                session, self.workspace.id, "TCP Congestion Control"
            )
            fc = Flashcard(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                topic_id=topic.id,
                question="What is TCP slow start?",
                answer="Exponential increase of the congestion window",
                difficulty="hard",
            )
            session.add(fc)
            await session.commit()
            await session.refresh(fc)
            fc_id = fc.id

        # Review card with rating 3 (easy recall)
        res = self.client.post(
            f"/api/ai/flashcards/{fc_id}/review",
            json={"rating": 3},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)

        # Check that topic mastery was recorded
        async with self.async_session() as session:
            masteries = await get_workspace_topic_masteries(session, self.workspace.id, self.user.id)
            self.assertEqual(len(masteries), 1)
            self.assertEqual(masteries[0].topic_name, "TCP Congestion Control")
            self.assertEqual(masteries[0].total_attempts, 1)
            self.assertEqual(masteries[0].correct_attempts, 1)

    async def test_quiz_submission_updates_topic_mastery(self):
        """Verify submitting quiz answers updates topic mastery per question."""
        async with self.async_session() as session:
            quiz = Quiz(
                workspace_id=self.workspace.id,
                user_id=self.user.id,
                title="Algorithms Midterm",
                quiz_type="mcq",
                questions="""[
                    {
                        "id": "q1",
                        "question": "What is the worst-case time complexity of QuickSort?",
                        "options": ["O(n)", "O(n log n)", "O(n^2)", "O(1)"],
                        "correct_answer": 2,
                        "explanation": "When the pivot is the smallest or largest element.",
                        "topic": "Sorting Algorithms"
                    },
                    {
                        "id": "q2",
                        "question": "Which data structure is typically used for BFS?",
                        "options": ["Stack", "Queue", "Heap", "Tree"],
                        "correct_answer": 1,
                        "explanation": "BFS uses a FIFO queue.",
                        "topic": "Graph Traversals"
                    }
                ]""",
                max_score=2,
            )
            session.add(quiz)
            await session.commit()
            await session.refresh(quiz)
            quiz_id = quiz.id

        # Submit answers: answer Q1 correctly (index 2), Q2 incorrectly (index 0)
        submission = {
            "answers": [
                {
                    "question_id": "q1",
                    "answer": 2,
                    "topic": "Sorting Algorithms",
                },
                {
                    "question_id": "q2",
                    "answer": 0,
                    "topic": "Graph Traversals",
                },
            ]
        }
        submit_res = self.client.post(
            f"/api/ai/quiz/{quiz_id}/submit",
            json=submission,
            headers=self.headers,
        )
        self.assertEqual(submit_res.status_code, 200)

        # Verify mastery updates for both topics
        async with self.async_session() as session:
            masteries = await get_workspace_topic_masteries(session, self.workspace.id, self.user.id)
            mastery_map = {m.topic_name: m for m in masteries}

            self.assertIn("Sorting Algorithms", mastery_map)
            self.assertEqual(mastery_map["Sorting Algorithms"].correct_attempts, 1)
            self.assertEqual(mastery_map["Sorting Algorithms"].total_attempts, 1)

            self.assertIn("Graph Traversals", mastery_map)
            self.assertEqual(mastery_map["Graph Traversals"].correct_attempts, 0)
            self.assertEqual(mastery_map["Graph Traversals"].total_attempts, 1)
            self.assertEqual(mastery_map["Graph Traversals"].status, "weak")


if __name__ == "__main__":
    unittest.main()
