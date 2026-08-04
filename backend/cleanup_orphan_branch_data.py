"""
One-time cleanup: finds Customer/Supplier/Account/Expense/AdvancePayment/
StockAdjustment/StockTransfer rows with branch_id IS NULL and assigns them
to a chosen branch, ahead of switching apply_branch_scope() to strict
per-branch filtering (see app/branch_scope.py).

Run with:  python cleanup_orphan_branch_data.py
Dry-run only by default -- prints what it WOULD change. Pass --apply to commit.
"""
import sys

from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.extensions import db
from app.models import Tenant, Branch, Customer, Supplier, Account, Expense, AdvancePayment
from app.models.stock_adjustment import StockAdjustment
from app.models.stock_transfer import StockTransfer

MODELS = [Customer, Supplier, Account, Expense, AdvancePayment, StockAdjustment, StockTransfer]

flask_app = create_app()
apply_changes = "--apply" in sys.argv

with flask_app.app_context():
    for tenant in Tenant.query.all():
        orphan_counts = {
            m.__name__: m.query.filter_by(tenant_id=tenant.id, branch_id=None).count()
            for m in MODELS
        }
        if not any(orphan_counts.values()):
            continue

        branches = Branch.query.filter_by(tenant_id=tenant.id, is_active=True).order_by(Branch.id.asc()).all()
        print(f"\nTenant '{tenant.company_name}' (id={tenant.id}) -- orphaned rows: {orphan_counts}")
        if not branches:
            print("  No branches exist for this tenant -- nothing to assign to, skipping.")
            continue

        target = branches[0]  # earliest-created branch = the one that existed before multi-branch
        print(f"  Will assign all orphaned rows to: '{target.name}' (id={target.id})")

        if not apply_changes:
            continue

        for model in MODELS:
            updated = model.query.filter_by(tenant_id=tenant.id, branch_id=None).update({"branch_id": target.id})
            if updated:
                print(f"    {model.__name__}: assigned {updated} rows")

    if apply_changes:
        db.session.commit()
        print("\nDone -- changes committed.")
    else:
        print("\nDry run only, nothing was changed. Re-run with --apply to commit.")
