from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt
from marshmallow import ValidationError

from app.extensions import db
from app.models import Tenant, User, Role, seed_default_roles, all_permission_keys, Branch
from app.schemas import SignupSchema, LoginSchema
from app.tenant_scope import TenantContext

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")


def _slugify(name: str) -> str:
    base = "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return base or "tenant"


def _issue_tokens(user: User) -> dict:
    permissions = list(user.role_ref.permissions) if user.role_ref else []
    if user.role_ref and user.role_ref.is_system:
        permissions = all_permission_keys()

    claims = {
        "tenant_id": user.tenant_id,
        "is_super_admin": user.is_super_admin,
        "role_id": user.role_id,
        "branch_id": user.branch_id,
        "permissions": permissions,
    }
    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)
    return {"access_token": access_token, "refresh_token": refresh_token}


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Tenant onboarding: creates the Tenant, seeds the two default Roles"""
    schema = SignupSchema()
    try:
        data = schema.load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    slug_base = _slugify(data["company_name"])
    slug = slug_base
    suffix = 1
    while Tenant.query.filter_by(slug=slug).first():
        suffix += 1
        slug = f"{slug_base}-{suffix}"

    tenant = Tenant(company_name=data["company_name"], slug=slug, billing_email=data["email"])
    db.session.add(tenant)
    db.session.flush()

    admin_role = seed_default_roles(tenant.id)

    admin = User(
        tenant_id=tenant.id,
        name=data["admin_name"],
        email=data["email"],
        role_id=admin_role.id,
        branch_id=None,
        is_super_admin=True,  # ✅ Make sure this is set
    )
    admin.set_password(data["password"])
    db.session.add(admin)
    db.session.commit()

    tokens = _issue_tokens(admin)
    
    # ✅ Get all branches for Super Admin
    all_branches = Branch.query.filter_by(tenant_id=tenant.id, is_active=True).all()
    
    return (
        jsonify({
            "tenant": tenant.to_dict(),
            "user": admin.to_dict(),
            "branches": [
                {
                    "id": b.id,
                    "name": b.name,
                    "code": b.code,
                    "is_default": False
                }
                for b in all_branches
            ],
            **tokens
        }),
        201,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    schema = LoginSchema()
    try:
        data = schema.load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    user = User.query.filter_by(email=data["email"]).first()

    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.is_active:
        return jsonify({"error": "This account has been deactivated"}), 403

    tokens = _issue_tokens(user)

    # ✅ Get accessible branches for the user
    if user.is_super_admin:
        # Super Admin gets ALL branches
        accessible_branches = Branch.query.filter_by(tenant_id=user.tenant_id, is_active=True).all()
    else:
        # Regular user gets only their assigned branch
        accessible_branches = user.get_accessible_branches()

    # ✅ Build permissions list for this user
    if user.is_super_admin:
        permissions = ["*"]
    elif user.role_ref and user.role_ref.is_system:
        permissions = all_permission_keys()
    else:
        permissions = list(user.role_ref.permissions) if user.role_ref else []

    user_data = user.to_dict()
    user_data["permissions"] = permissions

    return jsonify({
        "user": user_data,
        "branches": [
            {
                "id": b.id,
                "name": b.name,
                "code": b.code,
                "is_default": b.id == user.branch_id
            }
            for b in accessible_branches
        ],
        **tokens
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    from flask_jwt_extended import get_jwt_identity

    claims = get_jwt()
    identity = get_jwt_identity()

    TenantContext.set(claims.get("tenant_id"))
    user = User.query.get(int(identity))
    if not user:
        return jsonify({"error": "User not found"}), 404

    permissions = list(user.role_ref.permissions) if user.role_ref else []
    if user.role_ref and user.role_ref.is_system:
        permissions = all_permission_keys()

    new_claims = {
        "tenant_id": user.tenant_id,
        "is_super_admin": user.is_super_admin,
        "role_id": user.role_id,
        "branch_id": user.branch_id,
        "permissions": permissions,
    }
    access_token = create_access_token(identity=identity, additional_claims=new_claims)
    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    claims = get_jwt()
    TenantContext.set(claims.get("tenant_id"))
    from flask_jwt_extended import get_jwt_identity

    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    data = user.to_dict()

    if user.is_super_admin:
        data["permissions"] = ["*"]
    elif user.role_ref and user.role_ref.is_system:
        data["permissions"] = all_permission_keys()
    else:
        data["permissions"] = list(user.role_ref.permissions) if user.role_ref else []

    # ✅ Add branches to /me response
    if user.is_super_admin:
        accessible_branches = Branch.query.filter_by(tenant_id=user.tenant_id, is_active=True).all()
    else:
        accessible_branches = user.get_accessible_branches()
    
    data["branches"] = [
        {
            "id": b.id,
            "name": b.name,
            "code": b.code,
            "is_default": b.id == user.branch_id
        }
        for b in accessible_branches
    ]

    return jsonify(data), 200


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    claims = get_jwt()
    TenantContext.set(claims.get("tenant_id"))
    from flask_jwt_extended import get_jwt_identity

    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(force=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    avatar = data.get("avatar")

    if not name:
        return jsonify({"error": "Name is required"}), 422
    if not email:
        return jsonify({"error": "Email is required"}), 422

    duplicate = User.query.filter_by(tenant_id=user.tenant_id, email=email).first()
    if duplicate and duplicate.id != user.id:
        return jsonify({"error": "A user with this email already exists"}), 409

    user.name = name
    user.email = email
    if "avatar" in data:
        user.avatar = avatar

    db.session.commit()

    res = user.to_dict()
    res["permissions"] = list(user.role_ref.permissions) if user.role_ref else (
        ["*"] if user.is_super_admin else []
    )
    return jsonify(res), 200


@auth_bp.route("/password", methods=["PUT"])
@jwt_required()
def change_password():
    claims = get_jwt()
    TenantContext.set(claims.get("tenant_id"))
    from flask_jwt_extended import get_jwt_identity

    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(force=True) or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return jsonify({"error": "Current password and new password are required"}), 422

    if not user.check_password(current_password):
        return jsonify({"error": "Invalid current password"}), 401

    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 422

    user.set_password(new_password)
    db.session.commit()

    return jsonify({"message": "Password updated successfully"}), 200