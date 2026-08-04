from flask import Blueprint, request, jsonify
from marshmallow import ValidationError

from app.extensions import db
from app.models import Role, PERMISSION_CATALOG, all_permission_keys
from app.schemas import RoleSchema
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth, require_permission

roles_bp = Blueprint("roles", __name__, url_prefix="/api/v1/roles")


@roles_bp.route("/permissions", methods=["GET"])
@require_auth
def list_available_permissions():
    """
    Returns the full permission catalog so the frontend can render a
    checklist grouped by module without hardcoding the list twice.
    """
    return jsonify({"catalog": PERMISSION_CATALOG, "all_keys": all_permission_keys()})


@roles_bp.route("", methods=["GET"])
@require_auth
@require_permission("roles.view")
def list_roles():
    roles = Role.query.order_by(Role.name.asc()).all()
    return jsonify({"items": [r.to_dict() for r in roles]})


@roles_bp.route("/<int:role_id>", methods=["GET"])
@require_auth
@require_permission("roles.view")
def get_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    return jsonify(role.to_dict())


@roles_bp.route("", methods=["POST"])
@require_auth
@require_permission("roles.create")
def create_role():
    try:
        data = RoleSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if Role.query.filter_by(name=data["name"]).first():
        return jsonify({"error": "A role with this name already exists"}), 409

    valid_keys = set(all_permission_keys())
    invalid = [p for p in data["permissions"] if p not in valid_keys]
    if invalid:
        return jsonify({"error": f"Unknown permission keys: {invalid}"}), 422

    role = Role(tenant_id=TenantContext.get(), **data)
    db.session.add(role)
    db.session.commit()
    return jsonify(role.to_dict()), 201


@roles_bp.route("/<int:role_id>", methods=["PUT"])
@require_auth
@require_permission("roles.edit")
def update_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    if role.is_system:
        return jsonify({"error": "Built-in roles can't be edited"}), 403

    try:
        data = RoleSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if "permissions" in data:
        valid_keys = set(all_permission_keys())
        invalid = [p for p in data["permissions"] if p not in valid_keys]
        if invalid:
            return jsonify({"error": f"Unknown permission keys: {invalid}"}), 422

    for key, value in data.items():
        setattr(role, key, value)
    db.session.commit()
    return jsonify(role.to_dict())


@roles_bp.route("/<int:role_id>", methods=["DELETE"])
@require_auth
@require_permission("roles.delete")
def delete_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    if role.is_system:
        return jsonify({"error": "Built-in roles can't be deleted"}), 403
    if role.users.count() > 0:
        return jsonify({"error": "Reassign users away from this role before deleting it"}), 409

    db.session.delete(role)
    db.session.commit()
    return "", 204
