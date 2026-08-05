"""add branch_id to tenant_settings, scope store profile per branch

Revision ID: 46836cef4d03
Revises: ccfe70a01441
Create Date: 2026-08-05 11:12:46.381646

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '46836cef4d03'
down_revision = 'ccfe70a01441'
branch_labels = None
depends_on = None


# The 12 keys that already exist as tenant-wide (branch_id IS NULL) rows and
# need one copy per active branch. Everything else in tenant_settings
# (site_name, smtp_*, sms_*, payment_types, currency_list, ...) stays
# tenant-wide and is left alone.
STORE_DETAIL_KEYS = [
    "mobile", "tax_number", "pan_number", "store_website", "show_signature",
    "signature", "bank_details", "country", "state", "city", "postcode",
    "store_logo",
]

# New keys that replace the Tenant-row columns of the same name on the
# Store screen -- seeded per branch from the tenant's current value so
# nothing goes blank after the migration.
TENANT_COLUMN_KEYS = ["company_name", "billing_email", "phone", "address", "gstin"]


def upgrade():
    with op.batch_alter_table('tenant_settings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('branch_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_tenant_settings_branch_id'), ['branch_id'], unique=False)
        batch_op.create_foreign_key(None, 'branches', ['branch_id'], ['id'], ondelete='CASCADE')
        # Old constraint only covered (tenant_id, key) -- must go before the
        # backfill below, which intentionally inserts several rows sharing a
        # (tenant_id, key) pair (one per branch) that would violate it.
        batch_op.drop_constraint('uq_tenant_setting_key', type_='unique')

    keys_sql = ",".join(f"'{k}'" for k in STORE_DETAIL_KEYS)

    # Duplicate each existing tenant-wide store-detail row into one row per
    # active branch of that tenant.
    op.execute(
        f"""
        INSERT INTO tenant_settings (tenant_id, branch_id, `key`, value, created_at, updated_at)
        SELECT ts.tenant_id, br.id, ts.`key`, ts.value, NOW(), NOW()
        FROM tenant_settings ts
        JOIN branches br ON br.tenant_id = ts.tenant_id AND br.is_active = 1
        WHERE ts.branch_id IS NULL
          AND ts.`key` IN ({keys_sql})
        """
    )
    # The old tenant-wide rows for these keys are now superseded by the
    # per-branch copies above -- the routes will only ever read/write with a
    # branch_id from here on, so leaving them would just be dead data.
    op.execute(
        f"""
        DELETE FROM tenant_settings
        WHERE branch_id IS NULL
          AND `key` IN ({keys_sql})
        """
    )

    # Seed the 5 new keys per branch from the tenant's current column value
    # (these fields used to live directly on the tenants table).
    for key in TENANT_COLUMN_KEYS:
        op.execute(
            f"""
            INSERT INTO tenant_settings (tenant_id, branch_id, `key`, value, created_at, updated_at)
            SELECT t.id, br.id, '{key}', t.{key}, NOW(), NOW()
            FROM tenants t
            JOIN branches br ON br.tenant_id = t.id AND br.is_active = 1
            """
        )

    with op.batch_alter_table('tenant_settings', schema=None) as batch_op:
        batch_op.create_unique_constraint(
            'uq_tenant_setting_branch_key', ['tenant_id', 'branch_id', 'key']
        )


def downgrade():
    with op.batch_alter_table('tenant_settings', schema=None) as batch_op:
        batch_op.drop_constraint('uq_tenant_setting_branch_key', type_='unique')

    keys_sql = ",".join(f"'{k}'" for k in STORE_DETAIL_KEYS + TENANT_COLUMN_KEYS)
    op.execute(f"DELETE FROM tenant_settings WHERE branch_id IS NOT NULL AND `key` IN ({keys_sql})")

    with op.batch_alter_table('tenant_settings', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_tenant_settings_branch_id'))
        batch_op.drop_column('branch_id')
        batch_op.create_unique_constraint('uq_tenant_setting_key', ['tenant_id', 'key'])
