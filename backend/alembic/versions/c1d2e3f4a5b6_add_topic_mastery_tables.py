"""add_topic_mastery_tables

Revision ID: c1d2e3f4a5b6
Revises: f1a2b3c4d5e6
Create Date: 2026-09-16 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create topics table
    op.create_table(
        'topics',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('workspace_id', sa.String(), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('source_id', sa.String(), sa.ForeignKey('sources.id'), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), server_default=''),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('workspace_id', 'name', name='uq_workspace_topic_name'),
    )
    op.create_index('ix_topics_workspace_id', 'topics', ['workspace_id'])
    op.create_index('ix_topics_source_id', 'topics', ['source_id'])
    op.create_index('ix_topics_name', 'topics', ['name'])

    # 2. Create topic_mastery table
    op.create_table(
        'topic_mastery',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('workspace_id', sa.String(), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('topic_id', sa.String(), sa.ForeignKey('topics.id'), nullable=False),
        sa.Column('mastery_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('status', sa.String(), nullable=False, server_default='learning'),
        sa.Column('total_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('correct_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('consecutive_correct', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('consecutive_incorrect', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('revision_priority', sa.Float(), nullable=False, server_default='100.0'),
        sa.Column('last_practiced_at', sa.DateTime(), nullable=True),
        sa.Column('next_recommended_action', sa.String(), nullable=False, server_default='Practice'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', 'topic_id', name='uq_user_topic_mastery'),
    )
    op.create_index('ix_topic_mastery_user_id', 'topic_mastery', ['user_id'])
    op.create_index('ix_topic_mastery_workspace_id', 'topic_mastery', ['workspace_id'])
    op.create_index('ix_topic_mastery_topic_id', 'topic_mastery', ['topic_id'])
    op.create_index('ix_topic_mastery_status', 'topic_mastery', ['status'])
    op.create_index('ix_topic_mastery_priority', 'topic_mastery', ['revision_priority'])

    # 3. Create topic_performance_logs table
    op.create_table(
        'topic_performance_logs',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('workspace_id', sa.String(), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('topic_id', sa.String(), sa.ForeignKey('topics.id'), nullable=False),
        sa.Column('item_type', sa.String(), nullable=False),
        sa.Column('item_id', sa.String(), nullable=True),
        sa.Column('is_correct', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_topic_perf_user_topic', 'topic_performance_logs', ['user_id', 'topic_id'])
    op.create_index('ix_topic_perf_created', 'topic_performance_logs', ['created_at'])

    # 4. Add topic_id to flashcards
    op.add_column('flashcards', sa.Column('topic_id', sa.String(), sa.ForeignKey('topics.id'), nullable=True))
    op.create_index('ix_flashcards_topic_id', 'flashcards', ['topic_id'])


def downgrade() -> None:
    op.drop_index('ix_flashcards_topic_id', table_name='flashcards')
    op.drop_column('flashcards', 'topic_id')
    op.drop_table('topic_performance_logs')
    op.drop_table('topic_mastery')
    op.drop_table('topics')
