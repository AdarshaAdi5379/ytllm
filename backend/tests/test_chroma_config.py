"""Tests for Chroma client selection, connectivity, and isolation logic.

These tests mock the chromadb client constructors so they run without needing
real Chroma Cloud credentials or a running Chroma server. They validate the
*selection* logic (cloud vs http vs error) and the connectivity-check helper's
structure, not the real network path.
"""

import inspect
import unittest
from unittest import mock

import app.services.embedding_service as es


class ChromaSelectionTests(unittest.TestCase):
    def setUp(self):
        es.reset_chroma_client()

    def tearDown(self):
        es.reset_chroma_client()

    def test_api_key_selects_cloud(self):
        env = {"chroma_api_key": "sk-fake", "chroma_host": ""}
        with mock.patch.object(es, "config", {**es.config, **env}):
            es.reset_chroma_client()
            with mock.patch("app.services.embedding_service.chromadb.CloudClient") as m:
                es._get_client()
                m.assert_called_once()
                kwargs = m.call_args.kwargs
                self.assertEqual(kwargs["api_key"], "sk-fake")
                self.assertEqual(kwargs["tenant"], es.config["chroma_tenant"])
                self.assertEqual(kwargs["database"], es.config["chroma_database"])

    def test_host_selects_http(self):
        env = {"chroma_api_key": "", "chroma_host": "chromadb", "chroma_port": 8000}
        with mock.patch.object(es, "config", {**es.config, **env}):
            es.reset_chroma_client()
            with mock.patch("app.services.embedding_service.chromadb.HttpClient") as m:
                es._get_client()
                m.assert_called_once()
                kwargs = m.call_args.kwargs
                self.assertEqual(kwargs["host"], "chromadb")
                self.assertEqual(kwargs["port"], 8000)
                self.assertTrue(kwargs["ssl"])
                self.assertIsNone(kwargs["headers"])

    def test_neither_raises(self):
        env = {"chroma_api_key": "", "chroma_host": ""}
        with mock.patch.object(es, "config", {**es.config, **env}):
            es.reset_chroma_client()
            with self.assertRaises(RuntimeError) as ctx:
                es._get_client()
            self.assertIn("not configured", str(ctx.exception))

    def test_api_key_takes_precedence_over_host(self):
        env = {"chroma_api_key": "sk-fake", "chroma_host": "should-be-ignored"}
        with mock.patch.object(es, "config", {**es.config, **env}):
            es.reset_chroma_client()
            self.assertEqual(es.resolve_chroma_client_type(), "cloud")

    def test_persistent_client_never_used(self):
        """Guard: the app source must never instantiate PersistentClient."""
        src = inspect.getsource(es)
        self.assertNotIn("chromadb.PersistentClient(", src)


class ChromaConnectivityTest(unittest.TestCase):
    def test_connectivity_ok_returns_ok_true(self):
        fake_client = mock.MagicMock()
        fake_client.heartbeat.return_value = 1

        with mock.patch.object(es, "config", {**es.config, "chroma_api_key": "sk-fake", "chroma_host": ""}), \
             mock.patch("app.services.embedding_service.chromadb.CloudClient", return_value=fake_client):
            es.reset_chroma_client()
            res = es.check_chroma_connectivity()
        self.assertTrue(res["ok"])
        self.assertEqual(res["backend"], "cloud")
        self.assertIsNone(res["error"])
        fake_client.heartbeat.assert_called_once()
        fake_client.delete_collection.assert_called()

    def test_connectivity_error_captured(self):
        with mock.patch.object(es, "config", {**es.config, "chroma_api_key": "", "chroma_host": ""}), \
             mock.patch("app.services.embedding_service.chromadb.CloudClient"):
            es.reset_chroma_client()
            res = es.check_chroma_connectivity()
        self.assertFalse(res["ok"])
        self.assertIsNotNone(res["error"])


class CollectionNameTests(unittest.TestCase):
    def test_collection_name_prefix(self):
        self.assertEqual(es._collection_name("abc123"), "video_abc123")

    def test_collection_name_isolation(self):
        """Different index keys -> different collection names."""
        a = es._collection_name("source1")
        b = es._collection_name("source2")
        self.assertNotEqual(a, b)


if __name__ == "__main__":
    unittest.main()
