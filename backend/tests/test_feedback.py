import unittest

from pydantic import ValidationError

from app.db_models import Base
from app.models import FeedbackRequest


class TestFeedbackSchema(unittest.TestCase):
    def test_feedback_table_registered_in_metadata(self):
        table_names = set(Base.metadata.tables.keys())
        self.assertIn("feedback", table_names)

    def test_feedback_request_requires_message(self):
        with self.assertRaises(ValidationError):
            FeedbackRequest()

    def test_feedback_request_rejects_empty_message(self):
        with self.assertRaises(ValidationError):
            FeedbackRequest(message="   ")

    def test_feedback_request_accepts_valid_message(self):
        req = FeedbackRequest(message="Great app!")
        self.assertEqual(req.message, "Great app!")

    def test_feedback_request_strips_message(self):
        req = FeedbackRequest(message="  Good stuff  ")
        self.assertEqual(req.message, "Good stuff")

    def test_feedback_request_rejects_long_message(self):
        with self.assertRaises(ValidationError):
            FeedbackRequest(message="x" * 5001)

    def test_feedback_request_accepts_5000_char_message(self):
        req = FeedbackRequest(message="x" * 5000)
        self.assertEqual(len(req.message), 5000)

    def test_feedback_request_valid_rating(self):
        req = FeedbackRequest(message="Test", rating=3)
        self.assertEqual(req.rating, 3)

    def test_feedback_request_rejects_invalid_rating(self):
        with self.assertRaises(ValidationError):
            FeedbackRequest(message="Test", rating=0)
        with self.assertRaises(ValidationError):
            FeedbackRequest(message="Test", rating=6)

    def test_feedback_request_valid_feedback_type(self):
        req = FeedbackRequest(message="Test", feedback_type="bug_report")
        self.assertEqual(req.feedback_type, "bug_report")

    def test_feedback_request_rejects_invalid_feedback_type(self):
        with self.assertRaises(ValidationError):
            FeedbackRequest(message="Test", feedback_type="spam")

    def test_feedback_request_valid_email(self):
        req = FeedbackRequest(message="Test", email="user@example.com")
        self.assertEqual(req.email, "user@example.com")

    def test_feedback_request_rejects_invalid_email(self):
        with self.assertRaises(ValidationError):
            FeedbackRequest(message="Test", email="not-an-email")

    def test_feedback_request_all_optional_fields(self):
        req = FeedbackRequest(
            message="Love it",
            feature_want="Dark mode",
            like_most="The UI",
            could_improve="Speed",
            feedback_type="improvement",
            rating=4,
            email="test@test.com",
        )
        self.assertEqual(req.feature_want, "Dark mode")
        self.assertEqual(req.like_most, "The UI")
        self.assertEqual(req.could_improve, "Speed")


class TestFeedbackRateLimit(unittest.TestCase):
    def test_feedback_endpoint_has_rate_limit(self):
        from app.routes.feedback import submit_feedback
        self.assertIsNotNone(
            getattr(submit_feedback, "__wrapped__", None),
            "submit_feedback must be decorated with @limiter.limit(...)",
        )


if __name__ == "__main__":
    unittest.main()
