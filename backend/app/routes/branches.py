from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Branch
from app.schemas.branch import BranchSchema
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth, require_permission
from app.utils.plan_limits import check_branch_limit

branches_bp = Blueprint("branches", __name__, url_prefix="/api/v1/branches")

@branches_bp.route("", methods=["GET"])
@require_auth
@require_permission("branches.view")
def list_branches():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()

    query = Branch.query.filter_by(is_active=True)
    if search:
        query = query.filter(
            db.or_(
                Branch.name.ilike(f"%{search}%"),
                Branch.code.ilike(f"%{search}%")
            )
        )
    pagination = query.order_by(Branch.name.asc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [b.to_dict() for b in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })

@branches_bp.route("/<int:branch_id>", methods=["GET"])
@require_auth
@require_permission("branches.view")
def get_branch(branch_id):
    branch = Branch.query.get_or_404(branch_id)
    return jsonify(branch.to_dict())

@branches_bp.route("", methods=["POST"])
@require_auth
@require_permission("branches.create")
def create_branch():
    try:
        data = BranchSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    allowed, limit_error = check_branch_limit()
    if not allowed:
        return jsonify({"error": limit_error}), 409

    # Check duplicate code
    existing = Branch.query.filter_by(code=data["code"]).first()
    if existing:
        return jsonify({"error": f"Branch code '{data['code']}' already exists"}), 409

    branch = Branch(
        tenant_id=TenantContext.get(),
        name=data["name"],
        code=data["code"],
        address=data.get("address"),
        phone=data.get("phone"),
        email=data.get("email"),
        is_active=data.get("is_active", True),
    )
    db.session.add(branch)
    db.session.commit()
    return jsonify(branch.to_dict()), 201

@branches_bp.route("/<int:branch_id>", methods=["PUT"])
@require_auth
@require_permission("branches.edit")
def update_branch(branch_id):
    branch = Branch.query.get_or_404(branch_id)
    try:
        data = BranchSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # If code is being changed, check duplicate
    if "code" in data and data["code"] != branch.code:
        existing = Branch.query.filter_by(code=data["code"]).first()
        if existing and existing.id != branch.id:
            return jsonify({"error": f"Branch code '{data['code']}' already exists"}), 409

    for key, value in data.items():
        setattr(branch, key, value)
    db.session.commit()
    return jsonify(branch.to_dict())

@branches_bp.route("/<int:branch_id>", methods=["DELETE"])
@require_auth
@require_permission("branches.delete")
def delete_branch(branch_id):
    branch = Branch.query.get_or_404(branch_id)
    # Soft delete: set inactive
    branch.is_active = False
    db.session.commit()
    return "", 204