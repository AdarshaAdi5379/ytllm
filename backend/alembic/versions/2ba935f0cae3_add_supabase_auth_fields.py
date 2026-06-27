"""add_supabase_auth_fields

Revision ID: 2ba935f0cae3
Revises: b9d4d8e6a1f2
Create Date: 2026-06-27 12:30:29.009828

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2ba935f0cae3'
down_revision: Union[str, Sequence[str], None] = 'b9d4d8e6a1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('supabase_user_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('display_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(), nullable=True))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.create_index(op.f('ix_users_supabase_user_id'), 'users', ['supabase_user_id'], unique=True)
    op.execute("UPDATE users SET updated_at = created_at WHERE updated_at IS NULL")
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password_hash', existing_type=sa.VARCHAR(), nullable=True)
        batch_op.alter_column('updated_at', existing_type=sa.DateTime(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('updated_at', existing_type=sa.DateTime(), nullable=True)
        batch_op.alter_column('password_hash', existing_type=sa.VARCHAR(), nullable=False)
        batch_op.drop_index('ix_users_supabase_user_id')
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'display_name')
    op.drop_column('users', 'supabase_user_id')
