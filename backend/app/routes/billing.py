from datetime import datetime

import razorpay
from flask import Blueprint, current_app, g, jsonify, request
from marshmallow import Schema, ValidationError, fields, validate

from app.extensions import db
from app.models import Branch, Tenant, User
from app.models.payment_transaction import PaymentStatus, PaymentTransaction
from app.models.plan import Plan
from app.models.tenant_license import LicenseStatus, TenantLicense
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth, require_permission, require_platform_admin

billing_bp = Blueprint("billing", __name__, url_prefix="/api/v1/billing")


def _razorpay_client() -> razorpay.Client:
    key_id = current_app.config["RAZORPAY_KEY_ID"]
    key_secret = current_app.config["RAZORPAY_KEY_SECRET"]
    if not key_id or not key_secret:
        raise RuntimeError("Razorpay keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)")
    return razorpay.Client(auth=(key_id, key_secret))


class CreateOrderSchema(Schema):
    plan_id = fields.Integer(required=True)


class VerifyPaymentSchema(Schema):
    razorpay_order_id = fields.String(required=True)
    razorpay_payment_id = fields.String(required=True)
    razorpay_signature = fields.String(required=True)


class AssignPlanSchema(Schema):
    tenant_id = fields.Integer(required=True)
    plan_id = fields.Integer(required=True)
    amc_valid_until = fields.Date(load_default=None, allow_none=True)
    status = fields.String(
        load_default=LicenseStatus.ACTIVE,
        validate=validate.OneOf([LicenseStatus.ACTIVE, LicenseStatus.SUSPENDED]),
    )


def _current_license_dict():
    license_ = TenantLicense.query.first()
    return license_.to_dict() if license_ else None


def _activate_plan(tenant_id: int, plan_id: int) -> TenantLicense:
    license_ = TenantLicense.query.first()
    if license_ is None:
        license_ = TenantLicense(tenant_id=tenant_id)
        db.session.add(license_)
    license_.plan_id = plan_id
    license_.purchased_at = datetime.utcnow()
    license_.status = LicenseStatus.ACTIVE
    return license_


# ── Tenant-facing ────────────────────────────────────────────────────────

@billing_bp.route("/plans", methods=["GET"])
@require_auth
def list_plans():
    """Every logged-in user can see what they could upgrade to."""
    plans = Plan.query.filter_by(is_active=True).order_by(Plan.price.asc()).all()
    return jsonify([p.to_dict() for p in plans])


@billing_bp.route("/license", methods=["GET"])
@require_auth
@require_permission("billing.view")
def get_license():
    branch_count = Branch.query.filter_by(is_active=True).count()
    user_count = User.query.filter_by(is_active=True).count()
    return jsonify({
        "license": _current_license_dict(),
        "usage": {"branch_count": branch_count, "user_count": user_count},
    })


@billing_bp.route("/checkout/order", methods=["POST"])
@require_auth
@require_permission("billing.view")
def create_order():
    try:
        data = CreateOrderSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    plan = Plan.query.filter_by(id=data["plan_id"], is_active=True).first()
    if not plan:
        return jsonify({"error": "That plan is not available"}), 422

    tenant_id = TenantContext.get()
    amount_paise = int(plan.price * 100)  # Razorpay Orders API takes the smallest currency unit
    receipt = f"tenant{tenant_id}-plan{plan.id}-{int(datetime.utcnow().timestamp())}"[:40]

    try:
        client = _razorpay_client()
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": {"tenant_id": str(tenant_id), "plan_id": str(plan.id)},
        })
    except Exception:
        current_app.logger.exception("Razorpay order creation failed")
        return jsonify({"error": "Could not start checkout. Please try again."}), 502

    txn = PaymentTransaction(
        tenant_id=tenant_id,
        plan_id=plan.id,
        razorpay_order_id=order["id"],
        amount=plan.price,
        currency="INR",
        status=PaymentStatus.CREATED,
        created_by_user_id=g.current_user_id,
    )
    db.session.add(txn)
    db.session.commit()

    return jsonify({
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": current_app.config["RAZORPAY_KEY_ID"],
        "plan": plan.to_dict(),
    }), 201


@billing_bp.route("/checkout/verify", methods=["POST"])
@require_auth
@require_permission("billing.view")
def verify_payment():
    try:
        data = VerifyPaymentSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    tenant_id = TenantContext.get()
    txn = PaymentTransaction.query.filter_by(razorpay_order_id=data["razorpay_order_id"]).first()
    if not txn:
        return jsonify({"error": "Unknown order"}), 404

    # Idempotency: browser retries / duplicate calls must not double-activate.
    if txn.status == PaymentStatus.PAID:
        return jsonify({"status": "already_verified", "license": _current_license_dict()}), 200

    try:
        client = _razorpay_client()
        client.utility.verify_payment_signature({
            "razorpay_order_id": data["razorpay_order_id"],
            "razorpay_payment_id": data["razorpay_payment_id"],
            "razorpay_signature": data["razorpay_signature"],
        })
    except razorpay.errors.SignatureVerificationError:
        txn.status = PaymentStatus.FAILED
        db.session.commit()
        return jsonify({"error": "Payment verification failed"}), 422

    txn.razorpay_payment_id = data["razorpay_payment_id"]
    txn.razorpay_signature = data["razorpay_signature"]
    txn.status = PaymentStatus.PAID
    txn.verified_at = datetime.utcnow()

    _activate_plan(tenant_id, txn.plan_id)

    db.session.commit()
    return jsonify({"status": "verified", "license": _current_license_dict()}), 200


# ── Platform-admin (cross-tenant) ───────────────────────────────────────

@billing_bp.route("/admin/tenants", methods=["GET"])
@require_auth
@require_platform_admin
def admin_list_tenant_licenses():
    """Runs with no TenantContext set (platform-admin JWT carries
    tenant_id=None), so TenantScopedMixin auto-filtering is a no-op here by
    design -- see app/tenant_scope.py and require_platform_admin's docstring."""
    tenants = Tenant.query.all()
    licenses = {l.tenant_id: l for l in TenantLicense.query.all()}
    return jsonify([
        {
            "tenant": t.to_dict(),
            "license": licenses[t.id].to_dict() if t.id in licenses else None,
        }
        for t in tenants
    ])


@billing_bp.route("/admin/assign", methods=["POST"])
@require_auth
@require_platform_admin
def admin_assign_plan():
    try:
        data = AssignPlanSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    plan = Plan.query.get(data["plan_id"])
    if not plan:
        return jsonify({"error": "That plan doesn't exist"}), 422

    if not Tenant.query.get(data["tenant_id"]):
        return jsonify({"error": "That tenant doesn't exist"}), 422

    license_ = TenantLicense.query.filter_by(tenant_id=data["tenant_id"]).first()
    if license_ is None:
        license_ = TenantLicense(tenant_id=data["tenant_id"])
        db.session.add(license_)

    license_.plan_id = plan.id
    license_.status = data["status"]
    if data["amc_valid_until"] is not None:
        license_.amc_valid_until = data["amc_valid_until"]
    if license_.purchased_at is None:
        license_.purchased_at = datetime.utcnow()

    db.session.commit()
    return jsonify(license_.to_dict()), 200