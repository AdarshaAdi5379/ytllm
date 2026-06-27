"""create standalone tables

Revision ID: b9d4d8e6a1f2
Revises: 01f44cb84f03
Create Date: 2026-06-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b9d4d8e6a1f2"
down_revision: Union[str, Sequence[str], None] = "01f44cb84f03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "standalone_sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("guest_token", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_standalone_sessions_guest_token"), "standalone_sessions", ["guest_token"], unique=False)
    op.create_index(op.f("ix_standalone_sessions_user_id"), "standalone_sessions", ["user_id"], unique=False)
    op.create_index("ix_standalone_sessions_user_updated", "standalone_sessions", ["user_id", "updated_at"], unique=False)

    op.create_table(
        "standalone_messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("citations", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["standalone_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_standalone_messages_session_ts", "standalone_messages", ["session_id", "timestamp"], unique=False)
    op.create_index(op.f("ix_standalone_messages_session_id"), "standalone_messages", ["session_id"], unique=False)

    op.create_table(
        "standalone_sources",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("index_key", sa.String(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["standalone_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_standalone_sources_index_key"), "standalone_sources", ["index_key"], unique=False)
    op.create_index(op.f("ix_standalone_sources_session_id"), "standalone_sources", ["session_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_standalone_sources_session_id"), table_name="standalone_sources")
    op.drop_index(op.f("ix_standalone_sources_index_key"), table_name="standalone_sources")
    op.drop_table("standalone_sources")

    op.drop_index(op.f("ix_standalone_messages_session_id"), table_name="standalone_messages")
    op.drop_index("ix_standalone_messages_session_ts", table_name="standalone_messages")
    op.drop_table("standalone_messages")

    op.drop_index("ix_standalone_sessions_user_updated", table_name="standalone_sessions")
    op.drop_index(op.f("ix_standalone_sessions_user_id"), table_name="standalone_sessions")
    op.drop_index(op.f("ix_standalone_sessions_guest_token"), table_name="standalone_sessions")
    op.drop_table("standalone_sessions")
