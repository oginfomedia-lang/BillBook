import random
import string
from datetime import date, datetime

from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Coupon, Customer, CouponStatus, CouponType
from app.schemas.coupon import CouponSchema, CouponApplySchema
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth, require_permission

coupons_bp = Blueprint("coupons", __name__, url_prefix="/api/v1/coupons")


def generate_coupon_code() -> str:
    """Generate a random coupon code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


@coupons_bp.route("", methods=["GET"])
@require_auth
@require_permission("coupons.view")
def list_coupons():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()
    customer_id = request.args.get("customer_id", type=int)

    query = Coupon.query
    if search:
        query = query.filter(
            db.or_(
                Coupon.code.ilike(f"%{search}%"),
                Coupon.name.ilike(f"%{search}%")
            )
        )
    if customer_id:
        query = query.filter(Coupon.customer_id == customer_id)
    if status:
        if status == "active":
            query = query.filter(Coupon.is_active == True)
            query = query.filter(
                db.or_(
                    Coupon.expiry_date.is_(None),
                    Coupon.expiry_date >= date.today()
                )
            )
        elif status == "inactive":
            query = query.filter(Coupon.is_active == False)
        elif status == "expired":
            query = query.filter(Coupon.expiry_date < date.today())

    branch_id = request.args.get("branch_id", type=int)
    if branch_id:
        query = query.filter(Coupon.branch_id == branch_id)

    pagination = query.order_by(Coupon.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "items": [c.to_dict() for c in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


@coupons_bp.route("/<int:coupon_id>", methods=["GET"])
@require_auth
@require_permission("coupons.view")
def get_coupon(coupon_id):
    coupon = Coupon.query.get_or_404(coupon_id)
    return jsonify(coupon.to_dict())


@coupons_bp.route("", methods=["POST"])
@require_auth
@require_permission("coupons.create")
def create_coupon():
    try:
        data = CouponSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # Generate code if not provided
    code = data.get("code") or ""
    code = code.strip()
    if not code:
        code = generate_coupon_code()
        data["code"] = code

    # Check for duplicate code
    existing = Coupon.query.filter_by(code=code).first()
    if existing:
        return jsonify({"error": f"Coupon code '{code}' already exists"}), 409

    # Extract branch_id
    branch_id = data.get("branch_id")

    coupon = Coupon(
        tenant_id=TenantContext.get(),
        code=code,
        name=data["name"],
        description=data.get("description"),
        occasion=data.get("occasion"),
        type=CouponType(data["type"]),
        value=data["value"],
        expiry_date=data.get("expiry_date"),
        is_active=data.get("is_active", True),
        max_uses=data.get("max_uses", 0),
        customer_id=data.get("customer_id"),
        branch_id=branch_id,                             # 👈 Added
    )

    db.session.add(coupon)
    db.session.commit()

    return jsonify(coupon.to_dict()), 201


@coupons_bp.route("/<int:coupon_id>", methods=["PUT"])
@require_auth
@require_permission("coupons.edit")
def update_coupon(coupon_id):
    coupon = Coupon.query.get_or_404(coupon_id)

    try:
        data = CouponSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # If code is being changed, check for duplicates
    if "code" in data and data["code"] != coupon.code:
        existing = Coupon.query.filter_by(code=data["code"]).first()
        if existing and existing.id != coupon.id:
            return jsonify({"error": f"Coupon code '{data['code']}' already exists"}), 409

    # Update branch_id if provided
    if "branch_id" in data:
        coupon.branch_id = data["branch_id"]

    for key, value in data.items():
        if key == "type":
            setattr(coupon, key, CouponType(value))
        else:
            setattr(coupon, key, value)

    coupon.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(coupon.to_dict())


@coupons_bp.route("/<int:coupon_id>", methods=["DELETE"])
@require_auth
@require_permission("coupons.delete")
def delete_coupon(coupon_id):
    coupon = Coupon.query.get_or_404(coupon_id)
    db.session.delete(coupon)
    db.session.commit()
    return "", 204


@coupons_bp.route("/validate", methods=["POST"])
@require_auth
def validate_coupon():
    """
    Validate a coupon code in real-time and return the discount amount.
    Called during invoice creation/editing.
    """
    try:
        data = CouponApplySchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    code = data["code"].strip().upper()
    customer_id = data["customer_id"]
    subtotal = float(data["subtotal"])

    coupon = Coupon.query.filter_by(code=code).first()

    if not coupon:
        return jsonify({"error": "Invalid coupon code"}), 404

    # Check if coupon is valid
    if not coupon.is_valid_for_customer(customer_id):
        if not coupon.is_active:
            return jsonify({"error": "This coupon is inactive"}), 400
        if coupon.expiry_date and coupon.expiry_date < date.today():
            return jsonify({"error": "This coupon has expired"}), 400
        if coupon.max_uses > 0 and coupon.used_count >= coupon.max_uses:
            return jsonify({"error": "This coupon has reached its usage limit"}), 400
        if coupon.customer_id and coupon.customer_id != customer_id:
            return jsonify({"error": "This coupon is not valid for this customer"}), 400
        return jsonify({"error": "This coupon is not valid"}), 400

    # Calculate discount
    discount = coupon.calculate_discount(subtotal)

    return jsonify({
        "valid": True,
        "coupon": coupon.to_dict(),
        "discount": discount,
        "message": f"Coupon '{coupon.code}' applied! {coupon.value}% off" if coupon.type == CouponType.PERCENTAGE else f"Coupon '{coupon.code}' applied! ₹{coupon.value} off"
    })