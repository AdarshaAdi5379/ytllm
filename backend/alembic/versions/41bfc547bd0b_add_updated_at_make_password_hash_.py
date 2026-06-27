"""add_updated_at_make_password_hash_nullable

Revision ID: 41bfc547bd0b
Revises: 2ba935f0cae3
Create Date: 2026-06-27 12:31:02.883328

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '41bfc547bd0b'
down_revision: Union[str, Sequence[str], None] = '2ba935f0cae3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
