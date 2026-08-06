"""
Purges expired demo tenants.

Run via `flask sweep-demo` (CLI command registered in app/__init__.py),
intended to be triggered by system cron every 15 minutes -- NOT an
in-process scheduler (APScheduler etc. would race/duplicate across
gunicorn's multiple worker processes). This only handles CLEANUP; expiry
is already enforced live, per-request, by app/demo/guard.py regardless of
whether or how recently this has run.

Deletion order reuses TABLE_SPECS from app/routes/settings.py -- the same
hand-ordered (parents-before-children in the forward list, so REVERSED for
deletion) list already used and tested by that module's restore_backup()
delete step.

This is NOT optional: an earlier version of this function just did
`db.session.delete(tenant)` and trusted ON DELETE CASCADE to handle
everything, since TenantScopedMixin's tenant_id column IS declared
ondelete="CASCADE". That fails in practice -- confirmed with a real
IntegrityError while testing this function against a fully seeded demo
tenant -- because several inter-table FKs in this schema do NOT cascade
(e.g. items.brand_id/category_id/unit_id/tax_id have no ondelete clause
at all). MySQL cascades each FK path independently and doesn't guarantee
an order that respects those un-cascaded references, so e.g. a Brand row
could get cascade-deleted (via brands.tenant_id) before the Item row that
still points at it (via items.brand_id) has been removed. Explicitly
deleting in TABLE_SPECS' proven-safe order avoids that entirely.
"""
import logging
from datetime import datetime

from app.extensions import db
from app.models import Tenant
from app.routes.settings import TABLE_SPECS

logger = logging.getLogger(__name__)


def _purge_tenant(tenant: Tenant) -> None:
    tenant_id = tenant.id

    for _key, model, tenant_scoped, _parent_link in reversed(TABLE_SPECS):
        if tenant_scoped:
            model.query.filter_by(tenant_id=tenant_id).delete(synchronize_session=False)

    # Everything still tenant-owned at this point but outside TABLE_SPECS
    # (Tax, ItemGroup, TenantLicense, PaymentTransaction) -- and anything
    # only reachable via User, like PasswordResetToken (ondelete="CASCADE"
    # on user_id) -- is safe to leave to the Tenant row's own cascade:
    # nothing that could still block their deletion (e.g. Items, which
    # pointed at Tax/ItemGroup) is left after the loop above.
    db.session.delete(tenant)


def sweep_expired_demo_tenants() -> int:
    """
    Purges every tenant with is_demo=True whose demo_expires_at has
    passed. Each tenant is purged in its own transaction; a failure on one
    tenant is logged and skipped rather than aborting the whole sweep.
    """
    expired = Tenant.query.filter(
        Tenant.is_demo.is_(True), Tenant.demo_expires_at < datetime.utcnow()
    ).all()

    purged = 0
    for tenant in expired:
        tenant_id = tenant.id
        try:
            _purge_tenant(tenant)
            db.session.commit()
            purged += 1
        except Exception:
            db.session.rollback()
            logger.exception("Failed to purge expired demo tenant id=%s", tenant_id)

    return purged


def register_cli(app):
    @app.cli.command("sweep-demo")
    def sweep_demo_command():
        """Purge expired self-service demo tenants. Intended for cron: */15 * * * *"""
        count = sweep_expired_demo_tenants()
        print(f"Purged {count} expired demo tenant(s)")
