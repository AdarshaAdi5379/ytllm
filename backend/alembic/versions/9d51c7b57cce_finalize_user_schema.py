"""finalize_user_schema

Revision ID: 9d51c7b57cce
Revises: 41bfc547bd0b
Create Date: 2026-06-27 12:32:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9d51c7b57cce'
down_revision: Union[str, Sequence[str], None] = '41bfc547bd0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
