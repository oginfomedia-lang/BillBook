"""add is_demo and demo_expires_at to tenants

Revision ID: f4f600cbe8a8
Revises: 46836cef4d03
Create Date: 2026-08-06 14:13:49.287007

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4f600cbe8a8'
down_revision = '46836cef4d03'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('tenants', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column('demo_expires_at', sa.DateTime(), nullable=True))
        batch_op.create_index(
            batch_op.f('ix_tenants_is_demo_expires'), ['is_demo', 'demo_expires_at'], unique=False
        )


def downgrade():
    with op.batch_alter_table('tenants', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_tenants_is_demo_expires'))
        batch_op.drop_column('demo_expires_at')
        batch_op.drop_column('is_demo')
