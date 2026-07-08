"""
Accounts Routes
===============
CRUD for Chart of Accounts with parent-child hierarchy.
"""

from datetime import date

from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, validate, ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.account import Account
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth

accounts_bp = Blueprint("accounts", __name__, url_prefix="/api/v1/accounts")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AccountSchema(Schema):
    account_name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    parent_id = fields.Integer(load_default=None, allow_none=True)
    opening_balance = fields.Decimal(load_default=0)
    note = fields.String(load_default=None, allow_none=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_account_code() -> str:
    """Per-tenant sequential code: AC0001, AC0002, …"""
    last = (
        Account.query.filter(Account.tenant_id == TenantContext.get())
        .order_by(Account.id.desc())
        .with_entities(Account.account_code)
        .limit(1)
        .scalar()
    )
    if last and last.startswith("AC"):
        try:
            seq = int(last[2:])
        except ValueError:
            seq = 0
    else:
        seq = 0
    return f"AC{seq + 1:04d}"


# ---------------------------------------------------------------------------
# List (paginated)
# ---------------------------------------------------------------------------

@accounts_bp.route("", methods=["GET"])
@require_auth
def list_accounts():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 200)
    search = request.args.get("search", "").strip()

    query = Account.query
    if search:
        query = query.filter(
            db.or_(
                Account.account_name.ilike(f"%{search}%"),
                Account.account_code.ilike(f"%{search}%"),
            )
        )

    pagination = query.order_by(Account.account_code.asc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [a.to_dict() for a in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


# ---------------------------------------------------------------------------
# All (for dropdowns — no pagination)
# ---------------------------------------------------------------------------

@accounts_bp.route("/all", methods=["GET"])
@require_auth
def all_accounts():
    """Return all accounts for dropdown use (no pagination)."""
    accounts = Account.query.order_by(Account.account_name.asc()).all()
    return jsonify([a.to_dict() for a in accounts])


# ---------------------------------------------------------------------------
# Next account code preview
# ---------------------------------------------------------------------------

@accounts_bp.route("/next-code", methods=["GET"])
@require_auth
def next_account_code():
    """Return what the next account code would be (for form pre-fill)."""
    return jsonify({"account_code": _generate_account_code()})


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------

@accounts_bp.route("/<int:account_id>", methods=["GET"])
@require_auth
def get_account(account_id):
    account = Account.query.get_or_404(account_id)
    return jsonify(account.to_dict(include_children=True))


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@accounts_bp.route("", methods=["POST"])
@require_auth
def create_account():
    try:
        data = AccountSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    for attempt in range(5):
        code = _generate_account_code()
        account = Account(
            tenant_id=TenantContext.get(),
            account_code=code,
            account_name=data["account_name"],
            parent_id=data.get("parent_id"),
            opening_balance=data.get("opening_balance", 0),
            current_balance=data.get("opening_balance", 0),
            note=data.get("note"),
            created_by=getattr(g, "current_user_id", None),
        )
        db.session.add(account)
        try:
            db.session.commit()
            return jsonify(account.to_dict()), 201
        except IntegrityError:
            db.session.rollback()
            continue

    return jsonify({"error": "Unable to generate account code. Please retry."}), 500


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@accounts_bp.route("/<int:account_id>", methods=["PUT"])
@require_auth
def update_account(account_id):
    account = Account.query.get_or_404(account_id)
    try:
        data = AccountSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if "account_name" in data:
        account.account_name = data["account_name"]
    if "parent_id" in data:
        # Prevent setting self as parent
        if data["parent_id"] != account.id:
            account.parent_id = data["parent_id"]
    if "opening_balance" in data:
        diff = float(data["opening_balance"]) - float(account.opening_balance or 0)
        account.opening_balance = data["opening_balance"]
        account.current_balance = float(account.current_balance or 0) + diff
    if "note" in data:
        account.note = data["note"]

    db.session.commit()
    return jsonify(account.to_dict())


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@accounts_bp.route("/<int:account_id>", methods=["DELETE"])
@require_auth
def delete_account(account_id):
    account = Account.query.get_or_404(account_id)
    # Re-parent children to this account's parent
    for child in account.children:
        child.parent_id = account.parent_id
    db.session.delete(account)
    db.session.commit()
    return "", 204
