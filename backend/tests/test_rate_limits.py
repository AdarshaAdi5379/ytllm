import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.middleware.rate_limit import limiter


class TestRateLimitConfiguration(unittest.IsolatedAsyncioTestCase):
    """Targeted tests for the production rate-limit hardening."""

    def test_default_limit_configured(self):
        """Every route is covered by a global default limit (guest abuse net)."""
        groups = limiter._default_limits
        self.assertTrue(groups, "limiter must define default_limits")
        # slowapi wraps each rate string in a LimitGroup; iterate the group to
        # get the concrete Limit objects and their rate strings.
        rate_strings = " ".join(
            str(lim.limit) for group in groups for lim in group
        )
        self.assertIn("minute", rate_strings)

    def test_expensive_endpoints_have_explicit_limits(self):
        """Chat/AI/import endpoints are wrapped by slowapi's limiter decorator."""
        from app.routes.standalone import chat as standalone_chat
        from app.routes.ai import chat as ai_chat
        from app.routes.ai import flashcards, quiz, learning_path, mentor
        from app.routes.sources import upload as sources_upload
        from app.routes import transcript

        wrapped = [
            standalone_chat.standalone_chat,
            ai_chat.chat_single,
            ai_chat.chat_multi,
            ai_chat.chat_workspace,
            flashcards.generate_flashcards,
            quiz.generate_quiz,
            learning_path.generate_path,
            mentor.respond_mentor,
            sources_upload.upload_document,
            transcript.load_transcript,
        ]
        for fn in wrapped:
            self.assertIsNotNone(
                getattr(fn, "__wrapped__", None),
                f"{fn.__name__} must be decorated with @limiter.limit(...)",
            )

    def test_rate_limit_returns_429_when_exceeded(self):
        """11th request to the standalone chat endpoint (10/min) gets 429."""
        # No context manager: avoids running app lifespan (migrations) in tests.
        client = TestClient(app)
        statuses = []
        for _ in range(11):
            res = client.post(
                "/api/standalone/sessions/test-session/chat",
                json={"question": "hi", "chat_history": []},
                headers={"X-Guest-Token": "ratelimit-test-guest"},
            )
            statuses.append(res.status_code)
        self.assertIn(429, statuses, f"expected a 429 among statuses: {statuses}")


if __name__ == "__main__":
    unittest.main()
