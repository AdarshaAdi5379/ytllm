"""add_auth_provider_to_users

Revision ID: e08fe825261f
Revises: 9d51c7b57cce
Create Date: 2026-06-27 20:44:21.231060

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e08fe825261f'
down_revision: Union[str, Sequence[str], None] = '9d51c7b57cce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('auth_provider', sa.String(), nullable=True))

    # Populate existing rows: supabase users get "supabase", legacy users get "legacy"
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE users SET auth_provider = 'supabase' "
            "WHERE supabase_user_id IS NOT NULL AND auth_provider IS NULL"
        )
    )
    conn.execute(
        sa.text(
            "UPDATE users SET auth_provider = 'legacy' "
            "WHERE password_hash IS NOT NULL AND auth_provider IS NULL"
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'auth_provider')
