"""
Settings Routes
===============
Endpoints for managing tenant-scoped system configurations, store profiles, custom lists, and backups.
"""

import json
from datetime import datetime, date
from flask import Blueprint, request, jsonify, g, send_file, current_app
from io import BytesIO, StringIO
import csv
import zipfile
from app.extensions import db
from app.models import (
    Tenant, TenantSetting, User, Customer, Supplier, Warehouse, Branch,
    Purchase, PurchaseItem, PurchasePayment, PurchaseReturn, PurchaseReturnItem,
    Account, MoneyTransfer, Deposit, Item,
    Brand, Category, Unit, Variant, StockAdjustment, StockAdjustmentItem,
    StockTransfer, StockTransferItem,
    Expense, ExpenseCategory, Coupon, AdvancePayment,
    Invoice, InvoiceItem, Quotation, QuotationItem, Role
)
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext
from app.utils.decorators import require_auth
from app.utils.validators import validate_gstin
from marshmallow import ValidationError

settings_bp = Blueprint("settings", __name__, url_prefix="/api/v1/settings")

DEFAULT_SETTINGS = {
    "site_name": "BillBook",
    "footer_text": "Powered by BillBook",
    "logo_url": "",
    "favicon_url": "",
    "sms_provider": "none",
    "sms_api_key": "",
    "whatsapp_provider": "none",
    "whatsapp_api_key": "",
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_username": "",
    "smtp_password": "",
    "smtp_encryption": "tls",
    "smtp_from_address": "",
    "payment_types": json.dumps(["Cash", "Bank Transfer", "UPI", "Cheque", "Card"]),
    "currency_list": json.dumps([
        {"code": "INR", "symbol": "₹", "name": "Indian Rupee", "rate": 1.0, "is_default": True},
        {"code": "USD", "symbol": "$", "name": "US Dollar", "rate": 0.012, "is_default": False},
        {"code": "EUR", "symbol": "€", "name": "Euro", "rate": 0.011, "is_default": False},
        {"code": "GBP", "symbol": "£", "name": "British Pound", "rate": 0.009, "is_default": False}
    ])
}

@settings_bp.route("", methods=["GET"])
@require_auth
def get_settings():
    """Retrieve all dynamic key-value settings for the current tenant."""
    tenant_id = TenantContext.get()
    rows = TenantSetting.query.filter_by(tenant_id=tenant_id).all()
    db_settings = {row.key: row.value for row in rows}
    
    # Merge defaults with saved settings
    merged = {}
    for key, def_val in DEFAULT_SETTINGS.items():
        val = db_settings.get(key, def_val)
        # Parse JSON lists back to array/objects if needed
        if key in ["payment_types", "currency_list"]:
            try:
                merged[key] = json.loads(val)
            except Exception:
                merged[key] = json.loads(def_val)
        else:
            merged[key] = val
            
    return jsonify(merged)

@settings_bp.route("", methods=["POST"])
@require_auth
def update_settings():
    """Update settings keys in payload."""
    tenant_id = TenantContext.get()
    payload = request.get_json(force=True) or {}
    
    for key, value in payload.items():
        # Clean/format keys
        if key not in DEFAULT_SETTINGS:
            continue
            
        # Serialize lists/dicts to string
        if isinstance(value, (list, dict)):
            val_str = json.dumps(value)
        else:
            val_str = str(value) if value is not None else ""
            
        row = TenantSetting.query.filter_by(tenant_id=tenant_id, key=key).first()
        if row:
            row.value = val_str
        else:
            row = TenantSetting(tenant_id=tenant_id, key=key, value=val_str)
            db.session.add(row)
            
    db.session.commit()
    return get_settings()

# Keys stored per-branch on the Store screen -- includes the 5 that used to
# live directly on the Tenant row (company_name, billing_email, phone,
# address, gstin). See migration 46836cef4d03.
STORE_SETTINGS_KEYS = [
    "company_name", "billing_email", "phone", "address", "gstin",
    "mobile", "tax_number", "pan_number", "store_website",
    "show_signature", "signature", "bank_details", "country",
    "state", "city", "postcode", "store_logo",
]


@settings_bp.route("/store", methods=["GET"])
@require_auth
def get_store_settings():
    """Get the active branch's store profile (branch-scoped TenantSettings)."""
    tenant_id = TenantContext.get()
    branch_id = BranchContext.get()
    if not branch_id:
        return jsonify({"error": "Select a branch to view store settings"}), 400

    tenant = Tenant.query.get_or_404(tenant_id)

    rows = TenantSetting.query.filter(
        TenantSetting.tenant_id == tenant_id,
        TenantSetting.branch_id == branch_id,
        TenantSetting.key.in_(STORE_SETTINGS_KEYS),
    ).all()

    settings_dict = {row.key: row.value for row in rows}

    res = {
        "store_code": f"ST{tenant_id:05d}",
        "company_name": settings_dict.get("company_name", ""),
        "billing_email": settings_dict.get("billing_email", ""),
        "phone": settings_dict.get("phone", ""),
        "address": settings_dict.get("address", ""),
        "gstin": settings_dict.get("gstin", ""),
        "mobile": settings_dict.get("mobile", ""),
        "tax_number": settings_dict.get("tax_number", ""),
        "pan_number": settings_dict.get("pan_number", ""),
        "store_website": settings_dict.get("store_website", ""),
        "show_signature": settings_dict.get("show_signature", "false") == "true",
        "signature": settings_dict.get("signature", ""),
        "bank_details": settings_dict.get("bank_details", ""),
        "country": settings_dict.get("country", "India"),
        "state": settings_dict.get("state", "Maharashtra"),
        "city": settings_dict.get("city", "Pune"),
        "postcode": settings_dict.get("postcode", ""),
        "store_logo": settings_dict.get("store_logo", ""),
    }

    return jsonify(res)

@settings_bp.route("/store", methods=["PUT"])
@require_auth
def update_store_settings():
    """Update the active branch's store profile (branch-scoped TenantSettings)."""
    tenant_id = TenantContext.get()
    branch_id = BranchContext.get()
    if not branch_id:
        return jsonify({"error": "Select a branch to update store settings"}), 400

    payload = request.get_json(force=True) or {}

    new_gstin = payload.get("gstin", "")
    try:
        validate_gstin(new_gstin)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": {"gstin": err.messages}}), 422

    settings_keys = {
        "company_name": payload.get("company_name", ""),
        "billing_email": payload.get("billing_email", ""),
        "phone": payload.get("phone", ""),
        "address": payload.get("address", ""),
        "gstin": new_gstin,
        "mobile": payload.get("mobile", ""),
        "tax_number": payload.get("tax_number", ""),
        "pan_number": payload.get("pan_number", ""),
        "store_website": payload.get("store_website", ""),
        "show_signature": "true" if payload.get("show_signature") else "false",
        "signature": payload.get("signature", ""),
        "bank_details": payload.get("bank_details", ""),
        "country": payload.get("country", "India"),
        "state": payload.get("state", "Maharashtra"),
        "city": payload.get("city", "Pune"),
        "postcode": payload.get("postcode", ""),
        "store_logo": payload.get("store_logo", "")
    }

    for key, val in settings_keys.items():
        row = TenantSetting.query.filter_by(tenant_id=tenant_id, branch_id=branch_id, key=key).first()
        if row:
            row.value = val
        else:
            row = TenantSetting(tenant_id=tenant_id, branch_id=branch_id, key=key, value=val)
            db.session.add(row)

    db.session.commit()
    return get_store_settings()

# Ordered so every table appears AFTER every other table it has a foreign
# key into (parents before children) -- both download_backup() and
# restore_backup() rely on this order. `tenant_scoped=False` entries are
# child-of-child tables (line items etc.) that have no tenant_id column of
# their own -- they're reached via a join to their parent for export, and
# their parent's ON DELETE CASCADE handles cleanup for restore, so they
# never need an explicit delete.
TABLE_SPECS = [
    ("roles", Role, True, None),
    ("users", User, True, None),
    ("branches", Branch, True, None),
    ("warehouses", Warehouse, True, None),
    ("brands", Brand, True, None),
    ("categories", Category, True, None),
    ("units", Unit, True, None),
    ("customers", Customer, True, None),
    ("suppliers", Supplier, True, None),
    ("items", Item, True, None),
    ("variants", Variant, True, None),
    ("accounts", Account, True, None),
    ("coupons", Coupon, True, None),
    ("advance_payments", AdvancePayment, True, None),
    ("expense_categories", ExpenseCategory, True, None),
    ("expenses", Expense, True, None),
    ("money_transfers", MoneyTransfer, True, None),
    ("deposits", Deposit, True, None),
    ("purchases", Purchase, True, None),
    ("purchase_items", PurchaseItem, False, ("purchases", "purchase_id")),
    ("purchase_payments", PurchasePayment, False, ("purchases", "purchase_id")),
    ("purchase_returns", PurchaseReturn, True, None),
    ("purchase_return_items", PurchaseReturnItem, False, ("purchase_returns", "return_id")),
    ("stock_adjustments", StockAdjustment, True, None),
    ("stock_adjustment_items", StockAdjustmentItem, False, ("stock_adjustments", "adjustment_id")),
    ("stock_transfers", StockTransfer, True, None),
    ("stock_transfer_items", StockTransferItem, False, ("stock_transfers", "transfer_id")),
    ("invoices", Invoice, True, None),
    ("invoice_items", InvoiceItem, False, ("invoices", "invoice_id")),
    ("quotations", Quotation, True, None),
    ("quotation_items", QuotationItem, False, ("quotations", "quotation_id")),
    ("settings", TenantSetting, True, None),
]
_MODEL_BY_KEY = {key: model for key, model, *_ in TABLE_SPECS}

# For each table, which columns are foreign keys into ANOTHER table in
# TABLE_SPECS. Only these tables get new auto-generated IDs on restore, so
# only these need their references rewritten -- FKs into tables we don't
# touch (e.g. items.tax_id -> taxes) keep working unchanged since those
# rows' IDs never move.
FK_MAP = {
    "users": {"role_id": "roles", "branch_id": "branches"},
    "warehouses": {"branch_id": "branches"},
    "customers": {"branch_id": "branches"},
    "suppliers": {"branch_id": "branches"},
    "items": {"category_id": "categories", "brand_id": "brands", "unit_id": "units", "warehouse_id": "warehouses"},
    "accounts": {"branch_id": "branches", "parent_id": "accounts", "created_by": "users"},
    "coupons": {"customer_id": "customers", "branch_id": "branches"},
    "advance_payments": {"customer_id": "customers", "branch_id": "branches"},
    "expense_categories": {"branch_id": "branches"},
    "expenses": {"branch_id": "branches", "category_id": "expense_categories", "account_id": "accounts", "created_by_id": "users"},
    "money_transfers": {"branch_id": "branches", "debit_account_id": "accounts", "credit_account_id": "accounts", "created_by": "users"},
    "deposits": {"branch_id": "branches", "debit_account_id": "accounts", "credit_account_id": "accounts", "created_by": "users"},
    "purchases": {"supplier_id": "suppliers", "branch_id": "branches", "warehouse_id": "warehouses", "created_by": "users"},
    "purchase_items": {"purchase_id": "purchases", "item_id": "items"},
    "purchase_payments": {"purchase_id": "purchases"},
    "purchase_returns": {"purchase_id": "purchases", "branch_id": "branches", "supplier_id": "suppliers", "warehouse_id": "warehouses", "created_by": "users"},
    "purchase_return_items": {"return_id": "purchase_returns", "item_id": "items"},
    "stock_adjustments": {"branch_id": "branches", "warehouse_id": "warehouses", "created_by_id": "users"},
    "stock_adjustment_items": {"adjustment_id": "stock_adjustments", "item_id": "items"},
    "stock_transfers": {"branch_id": "branches", "from_warehouse_id": "warehouses", "to_warehouse_id": "warehouses", "created_by_id": "users"},
    "stock_transfer_items": {"transfer_id": "stock_transfers", "item_id": "items"},
    "invoices": {"customer_id": "customers", "branch_id": "branches", "created_by": "users"},
    "invoice_items": {"invoice_id": "invoices", "item_id": "items", "branch_id": "branches"},
    "quotations": {"customer_id": "customers", "branch_id": "branches", "warehouse_id": "warehouses", "converted_invoice_id": "invoices"},
    "quotation_items": {"quotation_id": "quotations", "item_id": "items"},
}

# Tables with no branch_id of their own -- tenant-wide shared/identity data
# (login accounts, role definitions, the branch list itself, unit/variant
# catalogs). A branch-scoped backup never exports, deletes, or restores
# these; they're left exactly as they are.
BRANCH_UNSCOPED_TABLES = {"roles", "users", "branches", "units", "variants"}


@settings_bp.route("/backup", methods=["GET"])
@require_auth
def download_backup():
    """
    Export a secure CSV backup (one CSV per table, zipped).

    If a branch is active (X-Branch-Id header set), the export is scoped to
    that branch only: branch-owned tables are filtered to branch_id, and
    tenant-wide shared tables (users, roles, branches, units, variants) are
    left out entirely -- they're not this branch's data. With no branch
    active, behavior is unchanged: a full tenant-wide export.
    """
    tenant_id = TenantContext.get()
    branch_id = BranchContext.get()
    tenant = Tenant.query.get_or_404(tenant_id)
    branch = Branch.query.get(branch_id) if branch_id else None

    def cell_value(v):
        if isinstance(v, (datetime, date)):
            return v.isoformat()
        return v

    export_specs = [
        spec for spec in TABLE_SPECS
        if not (branch_id and spec[0] in BRANCH_UNSCOPED_TABLES)
    ]

    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "_manifest.json",
            json.dumps({
                "exported_at": datetime.utcnow().isoformat(),
                "tenant_id": tenant_id,
                "company_name": tenant.company_name,
                "slug": tenant.slug,
                "scope": "branch" if branch_id else "tenant",
                "branch_id": branch_id,
                "branch_name": branch.name if branch else None,
                "tables": [key for key, *_ in export_specs],
            }, indent=2),
        )

        for key, model, tenant_scoped, parent_link in export_specs:
            if tenant_scoped:
                q = model.query.filter_by(tenant_id=tenant_id)
                if branch_id and hasattr(model, "branch_id"):
                    q = q.filter(model.branch_id == branch_id)
                rows = q.all()
            else:
                parent_key, fk_col = parent_link
                parent_model = _MODEL_BY_KEY[parent_key]
                q = model.query.join(parent_model, getattr(model, fk_col) == parent_model.id).filter(
                    parent_model.tenant_id == tenant_id
                )
                if branch_id and hasattr(parent_model, "branch_id"):
                    q = q.filter(parent_model.branch_id == branch_id)
                rows = q.all()

            columns = [c.name for c in model.__table__.columns]
            csv_buf = StringIO()
            writer = csv.DictWriter(csv_buf, fieldnames=columns)
            writer.writeheader()
            for r in rows:
                writer.writerow({c: cell_value(getattr(r, c)) for c in columns})

            zf.writestr(f"{key}.csv", csv_buf.getvalue())

    zip_buffer.seek(0)
    if branch:
        filename = f"billbook_backup_{tenant.slug}_{branch.code}_{date.today().isoformat()}.zip"
    else:
        filename = f"billbook_backup_{tenant.slug}_{date.today().isoformat()}.zip"

    return send_file(
        zip_buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/zip",
    )


@settings_bp.route("/restore", methods=["POST"])
@require_auth
def restore_backup():
    """
    Restores data from a backup ZIP (see download_backup()). DESTRUCTIVE:
    wipes the affected rows, then re-inserts from the CSVs. Runs in one
    transaction -- any failure rolls back everything.

    Scope must match: a tenant-wide backup can only be restored with no
    branch selected, and a branch backup can only be restored back onto the
    SAME branch it came from -- other branches (and tenant-wide shared
    tables: users, roles, branches, units, variants) are never touched by a
    branch-scoped restore.

    Row IDs are NOT preserved (this database's auto-increment counters are
    shared across every tenant, so the old IDs in the CSV are almost never
    free) -- every row gets a fresh ID, and every foreign key column listed
    in FK_MAP is rewritten to point at the corresponding new ID via id_map --
    EXCEPT columns pointing into a table this restore didn't touch (e.g.
    items.unit_id -> units, or any branch_id during a branch-scoped restore),
    which are left as their original value since that row never moved.
    """
    tenant_id = TenantContext.get()
    branch_id = BranchContext.get()
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No backup file uploaded"}), 422

    try:
        zf = zipfile.ZipFile(file)
    except zipfile.BadZipFile:
        return jsonify({"error": "Invalid backup file"}), 422

    try:
        manifest = json.loads(zf.read("_manifest.json"))
    except Exception:
        manifest = {}
    backup_scope = manifest.get("scope", "tenant")
    backup_branch_id = manifest.get("branch_id")
    current_scope = "branch" if branch_id else "tenant"

    if backup_scope != current_scope:
        return jsonify({
            "error": (
                f"This is a {backup_scope}-wide backup, but you currently "
                f"have {'a branch' if branch_id else 'no branch'} selected. "
                "Match the scope before restoring."
            )
        }), 422
    if backup_scope == "branch" and backup_branch_id != branch_id:
        return jsonify({"error": "This backup belongs to a different branch. Switch to that branch before restoring."}), 422

    restore_specs = [
        spec for spec in TABLE_SPECS
        if not (branch_id and spec[0] in BRANCH_UNSCOPED_TABLES)
    ]
    restore_keys = {spec[0] for spec in restore_specs}

    def coerce(column, raw):
        """CSV values are always strings -- cast back to the column's real
        Python type so MySQL doesn't choke on e.g. a DateTime column being
        handed the literal string '2026-07-29T10:23:00.123456'."""
        if raw is None:
            return None
        col_type = column.type
        try:
            if isinstance(col_type, db.DateTime):
                return datetime.fromisoformat(raw)
            if isinstance(col_type, db.Date):
                return date.fromisoformat(raw)
            if isinstance(col_type, db.Boolean):
                return raw in ("True", "true", "1")
        except ValueError:
            return None
        return raw

    try:
        # Only tenant-scoped (parent) tables need an explicit delete --
        # every child table's FK has ondelete="CASCADE", so deleting e.g.
        # a tenant's invoices automatically clears its invoice_items too.
        # Tables outside restore_specs (unscoped tables during a
        # branch-scoped restore) are never deleted.
        for key, model, tenant_scoped, _ in reversed(restore_specs):
            if tenant_scoped:
                q = model.query.filter_by(tenant_id=tenant_id)
                if branch_id and hasattr(model, "branch_id"):
                    q = q.filter(model.branch_id == branch_id)
                q.delete(synchronize_session=False)

        id_map: dict[str, dict[int, int]] = {}
        restored_tables = []

        for key, model, tenant_scoped, _ in restore_specs:
            if f"{key}.csv" not in zf.namelist():
                continue

            fk_cols = FK_MAP.get(key, {})
            columns_by_name = {c.name: c for c in model.__table__.columns}
            table_map: dict[int, int] = {}

            with zf.open(f"{key}.csv") as f:
                reader = csv.DictReader(f.read().decode("utf-8").splitlines())
                for row in reader:
                    old_id = int(row.pop("id"))
                    row.pop("tenant_id", None)  # always force to CURRENT tenant

                    clean_row = {}
                    for col_name, raw in row.items():
                        if col_name not in columns_by_name:
                            continue  # CSV is from an older schema version
                        val = raw if raw != "" else None
                        if col_name in fk_cols and val is not None:
                            target_key = fk_cols[col_name]
                            if target_key not in restore_keys:
                                # Target table wasn't touched by this restore
                                # (e.g. units/roles/branches during a
                                # branch-scoped restore) -- that row never
                                # moved, so the original id is still valid.
                                val = coerce(columns_by_name[col_name], val)
                            else:
                                # Remap to the NEW id of the already-restored
                                # parent row; None if it can't be resolved
                                # (e.g. a forward self-reference) rather than
                                # risk pointing at the wrong row.
                                val = id_map.get(target_key, {}).get(int(val))
                        else:
                            val = coerce(columns_by_name[col_name], val)
                        clean_row[col_name] = val

                    kwargs = clean_row
                    if tenant_scoped:
                        obj = model(tenant_id=tenant_id, **kwargs)
                    else:
                        obj = model(**kwargs)
                    db.session.add(obj)
                    db.session.flush()  # need obj.id immediately for id_map
                    table_map[old_id] = obj.id

            id_map[key] = table_map
            restored_tables.append(key)

        db.session.commit()
        return jsonify({"status": "restored", "scope": current_scope, "tables": restored_tables})
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Restore failed")
        return jsonify({"error": f"Restore failed, nothing was changed: {e}"}), 500
