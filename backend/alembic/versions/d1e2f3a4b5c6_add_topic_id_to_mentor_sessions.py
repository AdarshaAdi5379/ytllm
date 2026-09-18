"""add_topic_id_to_mentor_sessions

Revision ID: d1e2f3a4b5c6
Revises: c1d2e3f4a5b6
Create Date: 2026-09-16 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('mentor_sessions', sa.Column('topic_id', sa.String(), sa.ForeignKey('topics.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_mentor_sessions_topic_id', 'mentor_sessions', ['topic_id'])


def downgrade() -> None:
    op.drop_index('ix_mentor_sessions_topic_id', table_name='mentor_sessions')
    op.drop_column('mentor_sessions', 'topic_id')
