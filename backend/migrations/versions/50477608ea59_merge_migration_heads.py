"""Merge migration heads

Revision ID: 50477608ea59
Revises: a2628f5f2915, f1053517f83b
Create Date: 2026-07-03 11:13:59.351065

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '50477608ea59'
down_revision = ('a2628f5f2915', 'f1053517f83b')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
