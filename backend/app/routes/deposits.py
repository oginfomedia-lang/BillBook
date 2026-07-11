"""
Deposits Routes
===============
Record deposits into accounts, updating the credit account balance.
"""

from datetime import date

from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, validate, ValidationError

from app.extensions import db
from app.models.account import Account, Deposit
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth

deposits_bp = Blueprint("deposits", __name__, url_prefix="/api/v1/deposits")


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

class DepositSchema(Schema):
    debit_account_id = fields.Integer(load_default=None, allow_none=True)
    credit_account_id = fields.Integer(load_default=None, allow_none=True)
    amount = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    deposit_date = fields.Date(load_default=None, allow_none=True)
    reference_no = fields.String(load_default=None, allow_none=True)
    note = fields.String(load_default=None, allow_none=True)


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@deposits_bp.route("", methods=["GET"])
@require_auth
def list_deposits():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    deposit_date = request.args.get("deposit_date")
    debit_account_id = request.args.get("debit_account_id", type=int)
    credit_account_id = request.args.get("credit_account_id", type=int)
    created_by = request.args.get("created_by", type=int)

    query = Deposit.query
    query = apply_branch_scope(query, Deposit)
    if deposit_date:
        query = query.filter(Deposit.deposit_date == deposit_date)
    if debit_account_id:
        query = query.filter(Deposit.debit_account_id == debit_account_id)
    if credit_account_id:
        query = query.filter(Deposit.credit_account_id == credit_account_id)
    if created_by:
        query = query.filter(Deposit.created_by == created_by)
    if search:
        query = query.filter(Deposit.reference_no.ilike(f"%{search}%"))

    pagination = query.order_by(Deposit.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [d.to_dict() for d in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------

@deposits_bp.route("/<int:deposit_id>", methods=["GET"])
@require_auth
def get_deposit(deposit_id):
    deposit = Deposit.query.get_or_404(deposit_id)
    return jsonify(deposit.to_dict())


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@deposits_bp.route("", methods=["POST"])
@require_auth
def create_deposit():
    try:
        data = DepositSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    deposit = Deposit(
        tenant_id=TenantContext.get(),
        branch_id=BranchContext.get(),
        debit_account_id=data.get("debit_account_id"),
        credit_account_id=data.get("credit_account_id"),
        amount=data["amount"],
        deposit_date=data.get("deposit_date") or date.today(),
        reference_no=data.get("reference_no"),
        note=data.get("note"),
        created_by=getattr(g, "current_user_id", None),
    )
    db.session.add(deposit)

    # Update account balances
    amt = float(data["amount"])
    if data.get("debit_account_id"):
        debit = Account.query.get(data["debit_account_id"])
        if debit:
            debit.current_balance = float(debit.current_balance or 0) - amt
    if data.get("credit_account_id"):
        credit = Account.query.get(data["credit_account_id"])
        if credit:
            credit.current_balance = float(credit.current_balance or 0) + amt

    db.session.commit()
    return jsonify(deposit.to_dict()), 201


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@deposits_bp.route("/<int:deposit_id>", methods=["DELETE"])
@require_auth
def delete_deposit(deposit_id):
    deposit = Deposit.query.get_or_404(deposit_id)

    # Reverse balances
    amt = float(deposit.amount or 0)
    if deposit.debit_account:
        deposit.debit_account.current_balance = float(deposit.debit_account.current_balance or 0) + amt
    if deposit.credit_account:
        deposit.credit_account.current_balance = float(deposit.credit_account.current_balance or 0) - amt

    db.session.delete(deposit)
    db.session.commit()
    return "", 204
