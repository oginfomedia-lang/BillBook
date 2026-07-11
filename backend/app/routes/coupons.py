from flask import Blueprint, request, jsonify, g
from datetime import datetime
from marshmallow import ValidationError
import random
import string

from app.extensions import db
from app.models import Coupon
from app.schemas import CouponSchema, CouponApplySchema
from app.utils.decorators import require_auth, require_permission
from app.tenant_scope import TenantContext

coupons_bp = Blueprint("coupons", __name__, url_prefix="/api/v1/coupons")


@coupons_bp.route("", methods=["GET"])
@require_auth
@require_permission("coupons.view")
def list_coupons():
    """List all coupons"""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    branch_id = request.args.get("branch_id", type=int)

    query = Coupon.query.filter_by(tenant_id=g.tenant_id)
    
    # Apply branch filter
    if branch_id:
        query = query.filter(Coupon.branch_id == branch_id)
    
    if search:
        query = query.filter(
            db.or_(
                Coupon.code.ilike(f"%{search}%"),
                Coupon.name.ilike(f"%{search}%")
            )
        )

    pagination = query.order_by(Coupon.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify(
        {
            "items": [c.to_dict() for c in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }
    )


@coupons_bp.route("/<int:coupon_id>", methods=["GET"])
@require_auth
@require_permission("coupons.view")
def get_coupon(coupon_id):
    """Get a single coupon"""
    coupon = Coupon.query.filter_by(id=coupon_id, tenant_id=g.tenant_id).first_or_404()
    return jsonify(coupon.to_dict())


@coupons_bp.route("", methods=["POST"])
@require_auth
@require_permission("coupons.create")
def create_coupon():
    """Create a new coupon"""
    try:
        data = CouponSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # ✅ Handle empty or None code - generate if not provided
    code = data.get("code")
    if not code:
        # Generate random 8 character coupon code
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    else:
        code = code.upper()

    # Check if coupon code already exists
    existing = Coupon.query.filter_by(code=code, tenant_id=g.tenant_id).first()
    if existing:
        return jsonify({"error": f"Coupon code '{code}' already exists"}), 409

    # ✅ Handle expiry_date
    expiry_date = data.get("expiry_date")
    if expiry_date and isinstance(expiry_date, str):
        try:
            expiry_date = datetime.strptime(expiry_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid expiry date format. Use YYYY-MM-DD"}), 422

    coupon = Coupon(
        tenant_id=g.tenant_id,
        code=code,
        name=data.get("name", ""),
        description=data.get("description"),
        occasion=data.get("occasion"),
        type=data.get("type", "percentage"),
        value=data.get("value", 0),
        expiry_date=expiry_date,
        is_active=data.get("is_active", True),
        max_uses=data.get("max_uses", 0),
        customer_id=data.get("customer_id"),
        branch_id=data.get("branch_id"),
        used_count=0,
        created_at=datetime.utcnow()
    )
    
    db.session.add(coupon)
    db.session.commit()
    
    return jsonify(coupon.to_dict()), 201


@coupons_bp.route("/<int:coupon_id>", methods=["PUT"])
@require_auth
@require_permission("coupons.edit")
def update_coupon(coupon_id):
    """Update a coupon"""
    coupon = Coupon.query.filter_by(id=coupon_id, tenant_id=g.tenant_id).first_or_404()
    
    try:
        data = CouponSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # Check if code is being changed and already exists
    if "code" in data and data["code"] != coupon.code:
        existing = Coupon.query.filter_by(code=data["code"], tenant_id=g.tenant_id).first()
        if existing and existing.id != coupon.id:
            return jsonify({"error": f"Coupon code '{data['code']}' already exists"}), 409

    for key, value in data.items():
        setattr(coupon, key, value)
    
    coupon.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(coupon.to_dict())


@coupons_bp.route("/<int:coupon_id>", methods=["DELETE"])
@require_auth
@require_permission("coupons.delete")
def delete_coupon(coupon_id):
    """Soft delete a coupon"""
    coupon = Coupon.query.filter_by(id=coupon_id, tenant_id=g.tenant_id).first_or_404()
    coupon.is_active = False
    db.session.commit()
    return "", 204


@coupons_bp.route("/validate", methods=["POST"])
@require_auth
def validate_coupon():
    """Validate a coupon code for use in sale"""
    try:
        data = CouponApplySchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    code = data.get("code", "").strip().upper()
    customer_id = data.get("customer_id")
    subtotal = data.get("subtotal", 0)

    if not code:
        return jsonify({
            "valid": False,
            "error": "Coupon code is required"
        }), 400

    print(f"🔍 Validating coupon: {code}")

    # Find coupon in database
    coupon = Coupon.query.filter_by(
        code=code,
        tenant_id=g.tenant_id,
        is_active=True
    ).first()

    if not coupon:
        print(f"❌ Coupon not found: {code}")
        return jsonify({
            "valid": False,
            "error": f'Coupon "{code}" not found'
        }), 404

    print(f"✅ Coupon found: {coupon.code} - {coupon.name}")

    # Check expiry
    if coupon.expiry_date:
        if coupon.expiry_date < datetime.utcnow().date():
            return jsonify({
                "valid": False,
                "error": "Coupon has expired"
            }), 400

    # Check usage limit
    if coupon.max_uses > 0 and coupon.used_count >= coupon.max_uses:
        return jsonify({
            "valid": False,
            "error": "Coupon usage limit reached"
        }), 400

    # Check customer restriction
    if coupon.customer_id and customer_id and coupon.customer_id != customer_id:
        return jsonify({
            "valid": False,
            "error": "Coupon not valid for this customer"
        }), 400

    # Calculate discount
    if coupon.type == "percentage":
        discount_amount = subtotal * (coupon.value / 100)
        discount_type = "percentage"
    else:  # fixed
        discount_amount = min(coupon.value, subtotal)
        discount_type = "fixed"

    print(f"💰 Discount: {discount_amount} ({discount_type})")

    return jsonify({
        "valid": True,
        "coupon": {
            "id": coupon.id,
            "code": coupon.code,
            "name": coupon.name,
            "type": coupon.type,
            "value": float(coupon.value),
            "description": coupon.description,
            "occasion": coupon.occasion
        },
        "discount": {
            "amount": round(float(discount_amount), 2),
            "type": discount_type,
            "value": float(coupon.value)
        }
    }), 200


@coupons_bp.route("/apply", methods=["POST"])
@require_auth
def apply_coupon():
    """Apply coupon and increment used count"""
    try:
        data = CouponApplySchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    code = data.get("code", "").strip().upper()

    if not code:
        return jsonify({"error": "Coupon code is required"}), 400

    coupon = Coupon.query.filter_by(
        code=code,
        tenant_id=g.tenant_id,
        is_active=True
    ).first()

    if not coupon:
        return jsonify({"error": "Coupon not found"}), 404

    # Increment used count
    coupon.used_count += 1
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Coupon {code} applied successfully",
        "used_count": coupon.used_count
    }), 200