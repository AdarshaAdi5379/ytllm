"""add_feedback_table

Revision ID: a1b2c3d4e5f6
Revises: e08fe825261f
Create Date: 2026-09-05 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e08fe825261f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add feedback table for user feedback collection."""
    op.create_table(
        'feedback',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('guest_token', sa.String(), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('feature_want', sa.Text(), nullable=True),
        sa.Column('like_most', sa.Text(), nullable=True),
        sa.Column('could_improve', sa.Text(), nullable=True),
        sa.Column('feedback_type', sa.String(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_feedback_user_id', 'feedback', ['user_id'])
    op.create_index('ix_feedback_guest_token', 'feedback', ['guest_token'])
    op.create_index('ix_feedback_created_at', 'feedback', ['created_at'])


def downgrade() -> None:
    """Remove feedback table."""
    op.drop_index('ix_feedback_created_at', table_name='feedback')
    op.drop_index('ix_feedback_guest_token', table_name='feedback')
    op.drop_index('ix_feedback_user_id', table_name='feedback')
    op.drop_table('feedback')
