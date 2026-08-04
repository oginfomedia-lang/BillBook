from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError

from app.extensions import db
from app.models import User, Role
from app.schemas import UserCreateSchema, UserUpdateSchema
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth, require_permission
from app.utils.plan_limits import check_user_limit

users_bp = Blueprint("users", __name__, url_prefix="/api/v1/users")


@users_bp.route("", methods=["GET"])
@require_auth
@require_permission("users.view")
def list_users():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()

    query = User.query
    if search:
        query = query.filter(
            db.or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%"))
        )

    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify(
        {
            "items": [u.to_dict() for u in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }
    )


@users_bp.route("/<int:user_id>", methods=["GET"])
@require_auth
@require_permission("users.view")
def get_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    return jsonify(user.to_dict())


@users_bp.route("", methods=["POST"])
@require_auth
@require_permission("users.create")
def create_user():
    try:
        data = UserCreateSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    allowed, limit_error = check_user_limit()
    if not allowed:
        return jsonify({"error": limit_error}), 409

    tenant_id = TenantContext.get()

    if User.query.filter_by(tenant_id=tenant_id, email=data["email"]).first():
        return jsonify({"error": "A user with this email already exists in your workspace"}), 409

    role = Role.query.filter_by(id=data["role_id"]).first()
    if not role:
        return jsonify({"error": "That role doesn't exist"}), 422

    password = data.pop("password")
    user = User(
        tenant_id=tenant_id,
        name=data["name"],
        email=data["email"],
        role_id=data["role_id"],
        branch_id=data.get("branch_id"),
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@users_bp.route("/<int:user_id>", methods=["PUT"])
@require_auth
@require_permission("users.edit")
def update_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    payload = request.get_json(force=True) or {}

    # A user can't lock themselves out by deactivating their own account
    if user.id == g.current_user_id and payload.get("is_active") is False:
        return jsonify({"error": "You can't deactivate your own account"}), 422

    try:
        data = UserUpdateSchema(partial=True).load(payload)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if "role_id" in data and data["role_id"] is not None:
        if not Role.query.filter_by(id=data["role_id"]).first():
            return jsonify({"error": "That role doesn't exist"}), 422

    for key, value in data.items():
        setattr(user, key, value)
    db.session.commit()
    return jsonify(user.to_dict())


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@require_auth
@require_permission("users.delete")
def delete_user(user_id):
    if user_id == g.current_user_id:
        return jsonify({"error": "You can't delete your own account"}), 422

    user = User.query.filter_by(id=user_id).first_or_404()
    db.session.delete(user)
    db.session.commit()
    return "", 204
