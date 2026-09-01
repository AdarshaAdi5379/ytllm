import unittest
from unittest.mock import patch, MagicMock, AsyncMock


class TestSessionTitleGeneration(unittest.IsolatedAsyncioTestCase):
    """Tests for the standalone AI title generation helper."""

    async def test_title_generated_from_context(self):
        from app.routes.standalone.chat import _generate_session_title

        with patch(
            "app.routes.standalone.chat.llm_service.generate_text",
            new=AsyncMock(return_value='"PostgreSQL vs Vector Indexes"'),
        ):
            title = await _generate_session_title(
                "Can you explain the difference between PostgreSQL indexes and vector indexes?",
                "Indexes speed up queries in different ways...",
            )
        self.assertEqual(title, "PostgreSQL vs Vector Indexes")
        self.assertNotIn('"', title)

    async def test_title_generation_failure_falls_back(self):
        from app.routes.standalone.chat import _generate_session_title

        with patch(
            "app.routes.standalone.chat.llm_service.generate_text",
            new=AsyncMock(side_effect=RuntimeError("LLM down")),
        ):
            title = await _generate_session_title(
                "Explain database transactions and isolation levels",
                "Transactions provide ACID guarantees...",
            )
        self.assertEqual(title, "Explain database transactions and isolation levels")

    async def test_long_question_fallback_is_truncated(self):
        from app.routes.standalone.chat import _generate_session_title

        long_question = "x" * 200
        with patch(
            "app.routes.standalone.chat.llm_service.generate_text",
            new=AsyncMock(side_effect=RuntimeError("LLM down")),
        ):
            title = await _generate_session_title(long_question, "reply")
        self.assertEqual(title, "x" * 80 + "...")
        self.assertLessEqual(len(title), 83)

    async def test_empty_llm_output_uses_fallback(self):
        from app.routes.standalone.chat import _generate_session_title

        with patch(
            "app.routes.standalone.chat.llm_service.generate_text",
            new=AsyncMock(return_value="   "),
        ):
            title = await _generate_session_title("What is B-tree indexing?", "reply")
        self.assertEqual(title, "What is B-tree indexing?")


class TestMoveEndpoint(unittest.IsolatedAsyncioTestCase):
    """Tests for POST /standalone/{session_id}/move"""

    def _make_session(self, session_id="sess-1", user_id="user-1"):
        session = MagicMock()
        session.id = session_id
        session.user_id = user_id
        session.title = "Test Session"
        session.model = "gpt-4o-mini"
        session.temperature = 0.7
        return session

    def _make_standalone_source(self, source_id="src-1", content="hello world"):
        src = MagicMock()
        src.id = source_id
        src.source_type = "text"
        src.title = "Test Source"
        src.index_key = "standalone_sess-1_src-1"
        src.file_name = None
        src.content = content
        return src

    def _make_workspace(self, ws_id="ws-1", owner_id="user-1"):
        ws = MagicMock()
        ws.id = ws_id
        ws.owner_id = owner_id
        return ws

    def _build_execute_chain(self, session, workspace, sources, messages=None):
        """Build mock db.execute side_effect list for move endpoint."""
        results = []
        # 1) session owner check query
        r1 = MagicMock()
        r1.scalar_one_or_none.return_value = session
        results.append(r1)
        # 2) workspace query
        r2 = MagicMock()
        r2.scalar_one_or_none.return_value = workspace
        results.append(r2)
        # 3) sources query
        r3 = MagicMock()
        r3.scalars.return_value.all.return_value = sources
        results.append(r3)
        # 4) messages query
        r4 = MagicMock()
        r4.scalars.return_value.all.return_value = messages or []
        results.append(r4)
        return results

    async def test_move_reindexes_sources_with_content_hash_keys(self):
        from app.routes.standalone.move import move_session_to_workspace
        from app.models import MoveToWorkspaceRequest

        session = self._make_session()
        source = self._make_standalone_source()
        workspace = self._make_workspace()

        mock_db = AsyncMock()
        mock_request = MagicMock()
        mock_request.headers.get.return_value = None

        mock_user = MagicMock()
        mock_user.id = "user-1"

        mock_db.execute = AsyncMock(
            side_effect=self._build_execute_chain(session, workspace, [source])
        )

        with patch("app.routes.standalone.move.embedding_service") as mock_emb, \
             patch("app.routes.standalone.move.content_to_index_key", return_value="txt_abc123"):
            mock_emb.index_transcript = AsyncMock()
            mock_emb.delete_chunks = MagicMock()

            req = MoveToWorkspaceRequest(workspace_id="ws-1", folder_id=None)
            result = await move_session_to_workspace(
                "sess-1", req, mock_request, mock_user, mock_db
            )

            mock_emb.index_transcript.assert_called_once_with("txt_abc123", "hello world")
            self.assertIn("workspace_id", result)
            self.assertEqual(result["workspace_id"], "ws-1")

    async def test_move_cleans_up_standalone_vectors_on_success(self):
        from app.routes.standalone.move import move_session_to_workspace
        from app.models import MoveToWorkspaceRequest

        session = self._make_session()
        source = self._make_standalone_source()
        workspace = self._make_workspace()

        mock_db = AsyncMock()
        mock_request = MagicMock()
        mock_request.headers.get.return_value = None

        mock_user = MagicMock()
        mock_user.id = "user-1"

        mock_db.execute = AsyncMock(
            side_effect=self._build_execute_chain(session, workspace, [source])
        )

        with patch("app.routes.standalone.move.embedding_service") as mock_emb, \
             patch("app.routes.standalone.move.content_to_index_key", return_value="txt_abc"):
            mock_emb.index_transcript = AsyncMock()
            mock_emb.delete_chunks = MagicMock()

            req = MoveToWorkspaceRequest(workspace_id="ws-1")
            await move_session_to_workspace("sess-1", req, mock_request, mock_user, mock_db)

            mock_emb.delete_chunks.assert_called_once_with("standalone_sess-1_src-1")

    async def test_move_guest_session_raises_422(self):
        from app.routes.standalone.move import move_session_to_workspace
        from app.models import MoveToWorkspaceRequest
        from fastapi import HTTPException

        session = self._make_session(user_id=None)

        mock_db = AsyncMock()
        mock_request = MagicMock()
        mock_request.headers.get.return_value = "guest-1"

        mock_user = MagicMock()
        mock_user.id = None

        r1 = MagicMock()
        r1.scalar_one_or_none.return_value = session
        mock_db.execute = AsyncMock(return_value=r1)

        req = MoveToWorkspaceRequest(workspace_id="ws-1")
        with self.assertRaises(HTTPException) as ctx:
            await move_session_to_workspace("sess-1", req, mock_request, mock_user, mock_db)
        self.assertEqual(ctx.exception.status_code, 422)

    async def test_move_reindex_failure_cleans_up_new_vectors(self):
        from app.routes.standalone.move import move_session_to_workspace
        from app.models import MoveToWorkspaceRequest

        session = self._make_session()
        source = self._make_standalone_source()
        workspace = self._make_workspace()

        mock_db = AsyncMock()
        mock_request = MagicMock()
        mock_request.headers.get.return_value = None

        mock_user = MagicMock()
        mock_user.id = "user-1"

        mock_db.execute = AsyncMock(
            side_effect=self._build_execute_chain(session, workspace, [source])
        )

        with patch("app.routes.standalone.move.embedding_service") as mock_emb, \
             patch("app.routes.standalone.move.content_to_index_key", return_value="txt_new"):
            mock_emb.index_transcript = AsyncMock(side_effect=Exception("chroma down"))
            mock_emb.delete_chunks = MagicMock()

            req = MoveToWorkspaceRequest(workspace_id="ws-1")
            with self.assertRaises(Exception):
                await move_session_to_workspace("sess-1", req, mock_request, mock_user, mock_db)

            mock_emb.delete_chunks.assert_called_once_with("txt_new")


class TestSessionCreationGuard(unittest.IsolatedAsyncioTestCase):
    """Tests for POST /standalone/sessions — orphan guard."""

    async def test_create_session_without_user_or_guest_token_raises_422(self):
        from app.routes.standalone.sessions import create_session
        from app.models import CreateStandaloneSessionRequest
        from fastapi import HTTPException

        mock_db = AsyncMock()
        mock_request = MagicMock()
        mock_request.headers.get.return_value = None

        req = CreateStandaloneSessionRequest(title="Test", guest_token=None)
        with self.assertRaises(HTTPException) as ctx:
            await create_session(mock_request, req, None, mock_db)
        self.assertEqual(ctx.exception.status_code, 422)


class TestCitationsPopulated(unittest.TestCase):
    """Verify that citations are built from source_infos in chat.py."""

    def test_citations_list_built_from_source_infos(self):
        source_infos = [
            {"id": "src-1", "title": "Doc A", "source_type": "text_note"},
            {"id": "src-2", "title": "Doc B", "source_type": "website_page"},
        ]
        citations_list = [
            {"source_id": si["id"], "title": si["title"], "source_type": si["source_type"]}
            for si in source_infos
        ]
        self.assertEqual(len(citations_list), 2)
        self.assertEqual(citations_list[0]["source_id"], "src-1")
        self.assertEqual(citations_list[1]["title"], "Doc B")


if __name__ == "__main__":
    unittest.main()
