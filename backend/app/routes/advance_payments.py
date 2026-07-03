from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import AdvancePayment, Customer
from app.schemas.advance_payment import AdvancePaymentSchema
from app.tenant_scope import TenantContext
from app.utils.decorators import require_auth, require_permission

advance_payments_bp = Blueprint("advance_payments", __name__, url_prefix="/api/v1/advance-payments")


def _generate_advance_number() -> str:
    """Per‑tenant sequential: ADV-0001, ADV-0002, ..."""
    last = (
        AdvancePayment.query.filter_by(tenant_id=TenantContext.get())
        .order_by(AdvancePayment.id.desc())
        .with_entities(AdvancePayment.advance_number)
        .first()
    )
    if last and last[0].startswith("ADV-"):
        try:
            seq = int(last[0].split("-", 1)[1])
        except ValueError:
            seq = 0
    else:
        seq = 0
    return f"ADV-{seq + 1:04d}"


@advance_payments_bp.route("", methods=["GET"])
@require_auth
@require_permission("advance_payments.view")
def list_advance_payments():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    customer_id = request.args.get("customer_id", type=int)

    query = AdvancePayment.query
    if customer_id:
        query = query.filter(AdvancePayment.customer_id == customer_id)
    if search:
        query = query.join(Customer).filter(
            db.or_(
                AdvancePayment.advance_number.ilike(f"%{search}%"),
                Customer.name.ilike(f"%{search}%")
            )
        )

    branch_id = request.args.get("branch_id", type=int)
    if branch_id:
        query = query.filter(AdvancePayment.branch_id == branch_id)

    pagination = query.order_by(AdvancePayment.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [p.to_dict() for p in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


@advance_payments_bp.route("/<int:advance_id>", methods=["GET"])
@require_auth
@require_permission("advance_payments.view")
def get_advance_payment(advance_id):
    payment = AdvancePayment.query.get_or_404(advance_id)
    return jsonify(payment.to_dict())


@advance_payments_bp.route("", methods=["POST"])
@require_auth
@require_permission("advance_payments.create")
def create_advance_payment():
    try:
        data = AdvancePaymentSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    customer = Customer.query.get(data["customer_id"])
    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    # Extract branch_id
    branch_id = data.get("branch_id")

    # Generate unique number with retry
    for attempt in range(5):
        advance_number = _generate_advance_number()
        payment = AdvancePayment(
            tenant_id=TenantContext.get(),
            advance_number=advance_number,
            customer_id=data["customer_id"],
            amount=data["amount"],
            payment_date=data.get("payment_date"),
            payment_type=data["payment_type"],
            reference=data.get("reference"),
            notes=data.get("notes"),
            status=data.get("status", "pending"),
            branch_id=branch_id,                         # 👈 Added
        )
        db.session.add(payment)
        try:
            db.session.commit()
            return jsonify(payment.to_dict()), 201
        except IntegrityError:
            db.session.rollback()
            continue
    return jsonify({"error": "Unable to generate unique advance number"}), 500


@advance_payments_bp.route("/<int:advance_id>", methods=["PUT"])
@require_auth
@require_permission("advance_payments.edit")
def update_advance_payment(advance_id):
    payment = AdvancePayment.query.get_or_404(advance_id)
    try:
        data = AdvancePaymentSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # Prevent editing if already applied
    if payment.status == "applied" and "status" in data and data["status"] != "applied":
        return jsonify({"error": "Cannot change status of an applied payment"}), 422

    # Update branch_id if provided
    if "branch_id" in data:
        payment.branch_id = data["branch_id"]

    for key, value in data.items():
        setattr(payment, key, value)
    db.session.commit()
    return jsonify(payment.to_dict())


@advance_payments_bp.route("/<int:advance_id>", methods=["DELETE"])
@require_auth
@require_permission("advance_payments.delete")
def delete_advance_payment(advance_id):
    payment = AdvancePayment.query.get_or_404(advance_id)
    if payment.status == "applied":
        return jsonify({"error": "Cannot delete an applied payment"}), 422
    db.session.delete(payment)
    db.session.commit()
    return "", 204