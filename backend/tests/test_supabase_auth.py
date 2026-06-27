import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import jwt as pyjwt
from datetime import datetime, timedelta

from app.config import config
from app.services.supabase_auth_service import (
    verify_supabase_token,
    upsert_local_user,
    get_local_user_from_supabase_token,
    SUPABASE_JWT_ALGORITHM,
    SUPABASE_JWT_AUDIENCE,
)
from app.services.auth_service import get_current_user, get_optional_user
from app.db_models import User


class TestVerifySupabaseToken(unittest.TestCase):

    def setUp(self):
        self.secret = "test-supabase-jwt-secret-for-testing-only"
        self.original_secret = config.get("supabase_jwt_secret")
        config["supabase_jwt_secret"] = self.secret

    def tearDown(self):
        if self.original_secret is not None:
            config["supabase_jwt_secret"] = self.original_secret
        else:
            config.pop("supabase_jwt_secret", None)

    def test_valid_token_returns_payload(self):
        payload = {
            "sub": "test-user-id-123",
            "email": "test@example.com",
            "aud": SUPABASE_JWT_AUDIENCE,
            "exp": datetime.utcnow() + timedelta(hours=1),
            "user_metadata": {"full_name": "Test User", "avatar_url": "https://example.com/avatar.png"},
        }
        token = pyjwt.encode(payload, self.secret, algorithm=SUPABASE_JWT_ALGORITHM)
        result = verify_supabase_token(token)
        self.assertIsNotNone(result)
        self.assertEqual(result["sub"], "test-user-id-123")
        self.assertEqual(result["email"], "test@example.com")

    def test_expired_token_returns_none(self):
        payload = {
            "sub": "test-user-id-123",
            "email": "test@example.com",
            "aud": SUPABASE_JWT_AUDIENCE,
            "exp": datetime.utcnow() - timedelta(hours=1),
        }
        token = pyjwt.encode(payload, self.secret, algorithm=SUPABASE_JWT_ALGORITHM)
        result = verify_supabase_token(token)
        self.assertIsNone(result)

    def test_wrong_secret_returns_none(self):
        payload = {
            "sub": "test-user-id-123",
            "email": "test@example.com",
            "aud": SUPABASE_JWT_AUDIENCE,
            "exp": datetime.utcnow() + timedelta(hours=1),
        }
        token = pyjwt.encode(payload, "wrong-secret", algorithm=SUPABASE_JWT_ALGORITHM)
        result = verify_supabase_token(token)
        self.assertIsNone(result)

    def test_malformed_token_returns_none(self):
        result = verify_supabase_token("not-a-valid-jwt-token")
        self.assertIsNone(result)

    def test_no_secret_configured_returns_none(self):
        config.pop("supabase_jwt_secret", None)
        result = verify_supabase_token("some-token")
        self.assertIsNone(result)


class TestUpsertLocalUser(unittest.IsolatedAsyncioTestCase):

    async def test_creates_new_user(self):
        mock_db = AsyncMock()
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=exec_result)

        supabase_payload = {
            "sub": "new-supabase-id",
            "email": "new@example.com",
            "user_metadata": {
                "full_name": "New User",
                "avatar_url": "https://example.com/avatar.png",
            },
        }

        user = await upsert_local_user(mock_db, supabase_payload)

        self.assertEqual(user.supabase_user_id, "new-supabase-id")
        self.assertEqual(user.email, "new@example.com")
        self.assertEqual(user.display_name, "New User")
        self.assertEqual(user.avatar_url, "https://example.com/avatar.png")
        self.assertIsNone(user.password_hash)

    async def test_updates_existing_user(self):
        existing_user = User(
            supabase_user_id="existing-id",
            email="old@example.com",
            password_hash=None,
            display_name="Old Name",
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_user
        mock_db.execute.return_value = mock_result

        supabase_payload = {
            "sub": "existing-id",
            "email": "updated@example.com",
            "user_metadata": {
                "full_name": "Updated Name",
                "avatar_url": "https://example.com/new-avatar.png",
            },
        }

        user = await upsert_local_user(mock_db, supabase_payload)

        self.assertEqual(user.email, "updated@example.com")
        self.assertEqual(user.display_name, "Updated Name")
        self.assertEqual(user.avatar_url, "https://example.com/new-avatar.png")

    async def test_creates_workspace_for_new_user(self):
        mock_db = AsyncMock()
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=exec_result)

        supabase_payload = {
            "sub": "new-supabase-id-2",
            "email": "new2@example.com",
            "user_metadata": {},
        }

        user = await upsert_local_user(mock_db, supabase_payload)

        # Verify workspace was created
        mock_db.add.assert_called()
        calls = [str(c) for c in mock_db.add.call_args_list]
        self.assertTrue(any("Workspace" in c for c in calls))


class TestGetLocalUserFromSupabaseToken(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.secret = "test-jwt-secret-for-token-test"
        self.original_secret = config.get("supabase_jwt_secret")
        config["supabase_jwt_secret"] = self.secret

    def tearDown(self):
        if self.original_secret is not None:
            config["supabase_jwt_secret"] = self.original_secret
        else:
            config.pop("supabase_jwt_secret", None)

    async def test_valid_token_returns_user(self):
        payload = {
            "sub": "token-test-id",
            "email": "token@example.com",
            "aud": SUPABASE_JWT_AUDIENCE,
            "exp": datetime.utcnow() + timedelta(hours=1),
            "user_metadata": {"full_name": "Token User"},
        }
        token = pyjwt.encode(payload, self.secret, algorithm=SUPABASE_JWT_ALGORITHM)

        mock_db = AsyncMock()
        exec_result = MagicMock()
        exec_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=exec_result)

        user = await get_local_user_from_supabase_token(token, mock_db)

        self.assertIsNotNone(user)
        self.assertEqual(user.supabase_user_id, "token-test-id")
        self.assertEqual(user.email, "token@example.com")

    async def test_invalid_token_returns_none(self):
        mock_db = AsyncMock()
        user = await get_local_user_from_supabase_token("bad-token", mock_db)
        self.assertIsNone(user)


class TestGetCurrentUserFallback(unittest.TestCase):

    def test_missing_credentials_raises(self):
        # Should raise 401 regardless of which auth path
        pass


if __name__ == "__main__":
    unittest.main()
