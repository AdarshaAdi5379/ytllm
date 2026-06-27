import unittest

from app.db_models import Base


class TestStandaloneSchema(unittest.TestCase):
    def test_standalone_tables_are_registered_in_metadata(self):
        table_names = set(Base.metadata.tables.keys())

        self.assertIn("standalone_sessions", table_names)
        self.assertIn("standalone_messages", table_names)
        self.assertIn("standalone_sources", table_names)


if __name__ == "__main__":
    unittest.main()
