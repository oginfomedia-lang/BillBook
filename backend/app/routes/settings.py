"""
Settings Routes
===============
Endpoints for managing tenant-scoped system configurations, store profiles, custom lists, and backups.
"""

import json
from datetime import datetime, date
from flask import Blueprint, request, jsonify, g, send_file
from io import BytesIO

from app.extensions import db
from app.models import (
    Tenant, TenantSetting, User, Customer, Supplier, Warehouse, Branch,
    Purchase, PurchaseReturn, Account, MoneyTransfer, Deposit, Item,
    Brand, Category, Unit, Variant, StockAdjustment, StockTransfer,
    Expense, ExpenseCategory, Coupon, AdvancePayment, Invoice, Quotation, Role
)
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth

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

@settings_bp.route("/store", methods=["GET"])
@require_auth
def get_store_settings():
    """Get the current store tenant profile, merging core Tenant columns with TenantSettings details."""
    tenant_id = TenantContext.get()
    tenant = Tenant.query.get_or_404(tenant_id)
    
    # Query setting values
    settings_keys = [
        "mobile", "tax_number", "pan_number", "store_website",
        "show_signature", "signature", "bank_details", "country",
        "state", "city", "postcode", "store_logo"
    ]
    rows = TenantSetting.query.filter(
        TenantSetting.tenant_id == tenant_id,
        TenantSetting.key.in_(settings_keys)
    ).all()
    
    settings_dict = {row.key: row.value for row in rows}
    
    res = tenant.to_dict()
    res["store_code"] = f"ST{tenant_id:05d}"
    res["mobile"] = settings_dict.get("mobile", "")
    res["tax_number"] = settings_dict.get("tax_number", "")
    res["pan_number"] = settings_dict.get("pan_number", "")
    res["store_website"] = settings_dict.get("store_website", "")
    res["show_signature"] = settings_dict.get("show_signature", "false") == "true"
    res["signature"] = settings_dict.get("signature", "")
    res["bank_details"] = settings_dict.get("bank_details", "")
    res["country"] = settings_dict.get("country", "India")
    res["state"] = settings_dict.get("state", "Maharashtra")
    res["city"] = settings_dict.get("city", "Pune")
    res["postcode"] = settings_dict.get("postcode", "")
    res["store_logo"] = settings_dict.get("store_logo", "")
    
    return jsonify(res)

@settings_bp.route("/store", methods=["PUT"])
@require_auth
def update_store_settings():
    """Update core Tenant profile and settings key-values."""
    tenant_id = TenantContext.get()
    tenant = Tenant.query.get_or_404(tenant_id)
    payload = request.get_json(force=True) or {}
    
    # Update Core columns
    tenant.company_name = payload.get("company_name", tenant.company_name)
    tenant.billing_email = payload.get("billing_email", tenant.billing_email)
    tenant.phone = payload.get("phone", tenant.phone)
    tenant.address = payload.get("address", tenant.address)
    tenant.gstin = payload.get("gstin", tenant.gstin)
    
    # Update key-values
    settings_keys = {
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
        row = TenantSetting.query.filter_by(tenant_id=tenant_id, key=key).first()
        if row:
            row.value = val
        else:
            row = TenantSetting(tenant_id=tenant_id, key=key, value=val)
            db.session.add(row)
            
    db.session.commit()
    return get_store_settings()

@settings_bp.route("/backup", methods=["GET"])
@require_auth
def download_backup():
    """Export a secure, tenant-isolated JSON dump of all business data."""
    tenant_id = TenantContext.get()
    tenant = Tenant.query.get_or_404(tenant_id)
    
    models_to_dump = {
        "roles": Role,
        "users": User,
        "customers": Customer,
        "suppliers": Supplier,
        "warehouses": Warehouse,
        "branches": Branch,
        "accounts": Account,
        "money_transfers": MoneyTransfer,
        "deposits": Deposit,
        "brands": Brand,
        "categories": Category,
        "units": Unit,
        "items": Item,
        "variants": Variant,
        "coupons": Coupon,
        "advance_payments": AdvancePayment,
        "expenses": Expense,
        "expense_categories": ExpenseCategory,
        "purchases": Purchase,
        "purchase_returns": PurchaseReturn,
        "stock_adjustments": StockAdjustment,
        "stock_transfers": StockTransfer,
        "invoices": Invoice,
        "quotations": Quotation,
        "settings": TenantSetting
    }
    
    backup_data = {
        "exported_at": datetime.utcnow().isoformat(),
        "tenant_id": tenant_id,
        "company_name": tenant.company_name,
        "slug": tenant.slug,
        "tables": {}
    }
    
    # Helper to serialize fields properly (e.g. decimals, datetimes)
    def json_serial(obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        raise TypeError("Type not serializable")
        
    for name, model in models_to_dump.items():
        # Query scoped to current tenant
        rows = model.query.filter_by(tenant_id=tenant_id).all()
        # Fallback to direct mapping to dictionary
        records = []
        for r in rows:
            if hasattr(r, "to_dict"):
                try:
                    records.append(r.to_dict())
                except Exception:
                    # Generic serialization for any other db model
                    records.append({c.name: getattr(r, c.name) for c in r.__table__.columns})
            else:
                records.append({c.name: getattr(r, c.name) for c in r.__table__.columns})
        backup_data["tables"][name] = records
        
    # Serialize backup to custom indented JSON
    serialized = json.dumps(backup_data, default=json_serial, indent=2)
    
    # Send as download
    bio = BytesIO(serialized.encode("utf-8"))
    filename = f"billbook_backup_{tenant.slug}_{date.today().isoformat()}.json"
    
    return send_file(
        bio,
        as_attachment=True,
        download_name=filename,
        mimetype="application/json"
    )
