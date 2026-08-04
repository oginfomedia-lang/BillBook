from datetime import date
from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, validate, ValidationError
from sqlalchemy import func

from app.extensions import db
from app.models import Expense, ExpenseCategory, Account
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth

expenses_bp = Blueprint("expenses", __name__, url_prefix="/api/v1/expenses")

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ExpenseCategorySchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(allow_none=True)
    status = fields.String(validate=validate.OneOf(["active", "inactive"]), allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class ExpenseSchema(Schema):
    id = fields.Integer(dump_only=True)
    expense_date = fields.Date(allow_none=True)
    category_id = fields.Integer(required=True)
    reference_no = fields.String(allow_none=True, validate=validate.Length(max=100))
    expense_for = fields.String(allow_none=True, validate=validate.Length(max=255))
    amount = fields.Decimal(places=2, required=True)
    account_id = fields.Integer(allow_none=True)
    notes = fields.String(allow_none=True)
    created_by_id = fields.Integer(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


# ---------------------------------------------------------------------------
# Expense Categories
# ---------------------------------------------------------------------------

@expenses_bp.route("/categories", methods=["GET"])
@require_auth
def list_categories():
    query = ExpenseCategory.query.order_by(ExpenseCategory.name.asc())
    query = apply_branch_scope(query, ExpenseCategory)
    categories = query.all()
    return jsonify([c.to_dict() for c in categories])


@expenses_bp.route("/categories", methods=["POST"])
@require_auth
def create_category():
    try:
        data = ExpenseCategorySchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if ExpenseCategory.query.filter_by(name=data.get("name")).first():
        return jsonify({"error": "Category name already exists"}), 400

    cat = ExpenseCategory(
        tenant_id=TenantContext.get(),
        branch_id=BranchContext.get(),
        name=data.get("name"),
        description=data.get("description"),
        status=data.get("status") or "active",
    )
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201


@expenses_bp.route("/categories/<int:cat_id>", methods=["PUT"])
@require_auth
def update_category(cat_id):
    cat = ExpenseCategory.query.filter_by(id=cat_id).first_or_404()
    try:
        data = ExpenseCategorySchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data.get("name") and data.get("name") != cat.name:
        if ExpenseCategory.query.filter_by(name=data.get("name")).first():
            return jsonify({"error": "Category name already exists"}), 400

    for key, value in data.items():
        setattr(cat, key, value)
    db.session.commit()
    return jsonify(cat.to_dict())


@expenses_bp.route("/categories/<int:cat_id>", methods=["DELETE"])
@require_auth
def delete_category(cat_id):
    cat = ExpenseCategory.query.filter_by(id=cat_id).first_or_404()
    db.session.delete(cat)
    db.session.commit()
    return jsonify({"message": "Category deleted successfully"}), 200


# ---------------------------------------------------------------------------
# Expenses CRUD
# ---------------------------------------------------------------------------

@expenses_bp.route("", methods=["GET"])
@require_auth
def list_expenses():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    category_id = request.args.get("category_id", type=int)

    query = Expense.query.order_by(Expense.expense_date.desc(), Expense.id.desc())
    query = apply_branch_scope(query, Expense)

    if search:
        query = query.filter(
            db.or_(
                Expense.reference_no.ilike(f"%{search}%"),
                Expense.expense_for.ilike(f"%{search}%"),
                Expense.notes.ilike(f"%{search}%"),
            )
        )
    if category_id:
        query = query.filter(Expense.category_id == category_id)

    # Calculate total sum of expenses matching the filters
    total_amount_query = query.with_entities(func.sum(Expense.amount))
    total_amount = float(total_amount_query.scalar() or 0.0)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "expenses": [e.to_dict() for e in pagination.items],
        "total": pagination.total,
        "total_amount": total_amount,
        "page": page,
        "pages": pagination.pages,
        "per_page": per_page,
    })


@expenses_bp.route("/<int:expense_id>", methods=["GET"])
@require_auth
def get_expense(expense_id):
    exp = Expense.query.filter_by(id=expense_id).first_or_404()
    return jsonify(exp.to_dict())


@expenses_bp.route("", methods=["POST"])
@require_auth
def create_expense():
    try:
        data = ExpenseSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    exp = Expense(
        tenant_id=TenantContext.get(),
        branch_id=BranchContext.get(),
        expense_date=data.get("expense_date") or date.today(),
        category_id=data.get("category_id"),
        reference_no=data.get("reference_no"),
        expense_for=data.get("expense_for"),
        amount=data.get("amount"),
        account_id=data.get("account_id"),
        notes=data.get("notes"),
        created_by_id=g.current_user.id if hasattr(g, "current_user") else None,
    )
    db.session.add(exp)
    db.session.commit()
    return jsonify(exp.to_dict()), 201


@expenses_bp.route("/<int:expense_id>", methods=["PUT"])
@require_auth
def update_expense(expense_id):
    exp = Expense.query.filter_by(id=expense_id).first_or_404()
    try:
        data = ExpenseSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    for key, value in data.items():
        setattr(exp, key, value)
    db.session.commit()
    return jsonify(exp.to_dict())


@expenses_bp.route("/<int:expense_id>", methods=["DELETE"])
@require_auth
def delete_expense(expense_id):
    exp = Expense.query.filter_by(id=expense_id).first_or_404()
    db.session.delete(exp)
    db.session.commit()
    return jsonify({"message": "Expense deleted successfully"}), 200
