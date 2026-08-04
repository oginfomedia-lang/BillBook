"""
Money Transfers Routes
======================
Transfer money between two accounts (debit one, credit another).
Each transfer updates both account balances atomically.
"""

from datetime import date

from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, validate, ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.account import Account, MoneyTransfer
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth

money_transfers_bp = Blueprint("money_transfers", __name__, url_prefix="/api/v1/money-transfers")


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

class MoneyTransferSchema(Schema):
    debit_account_id = fields.Integer(required=True)
    credit_account_id = fields.Integer(required=True)
    amount = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    transfer_date = fields.Date(load_default=None, allow_none=True)
    reference_no = fields.String(load_default=None, allow_none=True)
    note = fields.String(load_default=None, allow_none=True)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _generate_transfer_code() -> str:
    """Per-tenant sequential code: TR-0001, TR-0002, …"""
    last = (
        MoneyTransfer.query.filter(MoneyTransfer.tenant_id == TenantContext.get())
        .order_by(MoneyTransfer.id.desc())
        .with_entities(MoneyTransfer.transfer_code)
        .limit(1)
        .scalar()
    )
    if last and last.startswith("TR-"):
        try:
            seq = int(last.split("-", 1)[1])
        except ValueError:
            seq = 0
    else:
        seq = 0
    return f"TR-{seq + 1:04d}"


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@money_transfers_bp.route("", methods=["GET"])
@require_auth
def list_transfers():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    transfer_date = request.args.get("transfer_date")
    debit_account_id = request.args.get("debit_account_id", type=int)
    credit_account_id = request.args.get("credit_account_id", type=int)
    created_by = request.args.get("created_by", type=int)

    query = MoneyTransfer.query
    query = apply_branch_scope(query, MoneyTransfer)
    if transfer_date:
        query = query.filter(MoneyTransfer.transfer_date == transfer_date)
    if debit_account_id:
        query = query.filter(MoneyTransfer.debit_account_id == debit_account_id)
    if credit_account_id:
        query = query.filter(MoneyTransfer.credit_account_id == credit_account_id)
    if created_by:
        query = query.filter(MoneyTransfer.created_by == created_by)
    if search:
        query = query.filter(
            db.or_(
                MoneyTransfer.transfer_code.ilike(f"%{search}%"),
                MoneyTransfer.reference_no.ilike(f"%{search}%"),
            )
        )

    pagination = query.order_by(MoneyTransfer.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [t.to_dict() for t in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------

@money_transfers_bp.route("/<int:transfer_id>", methods=["GET"])
@require_auth
def get_transfer(transfer_id):
    transfer = MoneyTransfer.query.filter_by(id=transfer_id).first_or_404()
    return jsonify(transfer.to_dict())


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@money_transfers_bp.route("", methods=["POST"])
@require_auth
def create_transfer():
    try:
        data = MoneyTransferSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data["debit_account_id"] == data["credit_account_id"]:
        return jsonify({"error": "Debit and credit accounts must be different"}), 422

    debit_acct = Account.query.filter_by(id=data["debit_account_id"]).first()
    credit_acct = Account.query.filter_by(id=data["credit_account_id"]).first()
    if not debit_acct or not credit_acct:
        return jsonify({"error": "One or both accounts not found"}), 404

    for attempt in range(5):
        code = _generate_transfer_code()
        transfer = MoneyTransfer(
            tenant_id=TenantContext.get(),
            branch_id=BranchContext.get(),
            transfer_code=code,
            debit_account_id=data["debit_account_id"],
            credit_account_id=data["credit_account_id"],
            amount=data["amount"],
            transfer_date=data.get("transfer_date") or date.today(),
            reference_no=data.get("reference_no"),
            note=data.get("note"),
            created_by=getattr(g, "current_user_id", None),
        )
        db.session.add(transfer)

        # Update account balances
        amt = float(data["amount"])
        debit_acct.current_balance = float(debit_acct.current_balance or 0) - amt
        credit_acct.current_balance = float(credit_acct.current_balance or 0) + amt

        try:
            db.session.commit()
            return jsonify(transfer.to_dict()), 201
        except IntegrityError:
            db.session.rollback()
            continue

    return jsonify({"error": "Unable to generate transfer code. Please retry."}), 500


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@money_transfers_bp.route("/<int:transfer_id>", methods=["DELETE"])
@require_auth
def delete_transfer(transfer_id):
    transfer = MoneyTransfer.query.filter_by(id=transfer_id).first_or_404()

    # Reverse account balances
    amt = float(transfer.amount or 0)
    if transfer.debit_account:
        transfer.debit_account.current_balance = float(transfer.debit_account.current_balance or 0) + amt
    if transfer.credit_account:
        transfer.credit_account.current_balance = float(transfer.credit_account.current_balance or 0) - amt

    db.session.delete(transfer)
    db.session.commit()
    return "", 204
