"""add_careers_and_job_applications

Revision ID: f1a2b3c4d5e6
Revises: e08fe825261f
Create Date: 2026-09-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e08fe825261f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add is_admin to users if not present
    op.add_column('users', sa.Column('is_admin', sa.Integer(), nullable=False, server_default='0'))

    # 2. Create job_postings table
    op.create_table(
        'job_postings',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('department', sa.String(), nullable=False),
        sa.Column('employment_type', sa.String(), nullable=False, server_default='full_time'),
        sa.Column('workplace_type', sa.String(), nullable=False, server_default='remote'),
        sa.Column('location', sa.String(), nullable=False, server_default='Remote'),
        sa.Column('duration', sa.String(), nullable=True),
        sa.Column('compensation_type', sa.String(), nullable=True),
        sa.Column('compensation_amount', sa.String(), nullable=True),
        sa.Column('short_description', sa.Text(), server_default=''),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('responsibilities', sa.Text(), server_default=''),
        sa.Column('requirements', sa.Text(), server_default=''),
        sa.Column('nice_to_have', sa.Text(), server_default=''),
        sa.Column('what_you_will_learn', sa.Text(), server_default=''),
        sa.Column('benefits', sa.Text(), server_default=''),
        sa.Column('application_method', sa.String(), server_default='internal'),
        sa.Column('application_url', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='draft'),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_job_postings_slug', 'job_postings', ['slug'], unique=True)
    op.create_index('ix_job_postings_department', 'job_postings', ['department'])
    op.create_index('ix_job_postings_status', 'job_postings', ['status'])
    op.create_index('ix_job_postings_status_dept', 'job_postings', ['status', 'department'])
    op.create_index('ix_job_postings_published_at', 'job_postings', ['published_at'])

    # 3. Create job_applications table
    op.create_table(
        'job_applications',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('job_id', sa.String(), sa.ForeignKey('job_postings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('resume', sa.Text(), nullable=False),
        sa.Column('github_url', sa.String(), nullable=True),
        sa.Column('linkedin_url', sa.String(), nullable=True),
        sa.Column('portfolio_url', sa.String(), nullable=True),
        sa.Column('cover_letter', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='new'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_job_applications_job_id', 'job_applications', ['job_id'])
    op.create_index('ix_job_applications_email', 'job_applications', ['email'])
    op.create_index('ix_job_applications_status', 'job_applications', ['status'])
    op.create_index('ix_job_applications_job_status', 'job_applications', ['job_id', 'status'])


def downgrade() -> None:
    op.drop_table('job_applications')
    op.drop_table('job_postings')
    op.drop_column('users', 'is_admin')
