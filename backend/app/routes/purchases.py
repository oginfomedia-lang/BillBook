"""
Purchase Routes
===============
Endpoints for managing supplier purchases, their line-items, and payments.
"""

from datetime import date
from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.purchase import (
    Purchase, PurchaseItem, PurchasePayment,
    PurchaseStatus, PurchasePaymentStatus, PurchasePaymentType,
)
from app.schemas.purchase_schemas import PurchaseSchema, PurchasePaymentSchema
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth

purchases_bp = Blueprint("purchases", __name__, url_prefix="/api/v1/purchases")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_purchase_code() -> str:
    """Per-tenant sequential code: PU-0001, PU-0002, …"""
    last = (
        Purchase.query.filter(Purchase.tenant_id == TenantContext.get())
        .order_by(Purchase.id.desc())
        .with_entities(Purchase.purchase_code)
        .limit(1)
        .scalar()
    )
    if last and last.startswith("PU-"):
        try:
            seq = int(last.split("-", 1)[1])
        except ValueError:
            seq = 0
    else:
        seq = 0
    return f"PU-{seq + 1:04d}"


def _parse_payment_type(raw: str) -> PurchasePaymentType:
    try:
        return PurchasePaymentType(raw.lower())
    except ValueError:
        return PurchasePaymentType.CASH


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@purchases_bp.route("/stats", methods=["GET"])
@require_auth
def get_purchase_stats():
    """Aggregate stats for the Purchase List dashboard cards."""
    warehouse_id = request.args.get("warehouse_id", type=int)

    q = Purchase.query
    q = apply_branch_scope(q, Purchase)
    
    if warehouse_id:
        q = q.filter(Purchase.warehouse_id == warehouse_id)

    total_invoices = q.count()
    agg = q.with_entities(
        func.coalesce(func.sum(Purchase.grand_total), 0).label("total_amount"),
        func.coalesce(func.sum(Purchase.amount_paid), 0).label("total_paid"),
    ).one()

    total_amount = float(agg.total_amount)
    total_paid = float(agg.total_paid)
    total_due = total_amount - total_paid

    return jsonify({
        "total_invoices": total_invoices,
        "total_amount": total_amount,
        "total_paid": total_paid,
        "total_due": max(0, total_due),
    })


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@purchases_bp.route("", methods=["GET"])
@require_auth
def list_purchases():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    warehouse_id = request.args.get("warehouse_id", type=int)
    status = request.args.get("status")
    payment_status = request.args.get("payment_status")
    search = request.args.get("search", "").strip()

    query = Purchase.query
    query = apply_branch_scope(query, Purchase)
    
    if warehouse_id:
        query = query.filter(Purchase.warehouse_id == warehouse_id)
    if status:
        query = query.filter(Purchase.status == status)
    if payment_status:
        query = query.filter(Purchase.payment_status == payment_status)
    if search:
        from app.models.supplier import Supplier
        query = query.join(Purchase.supplier).filter(
            db.or_(
                Purchase.purchase_code.ilike(f"%{search}%"),
                Purchase.reference_no.ilike(f"%{search}%"),
                Supplier.name.ilike(f"%{search}%"),
            )
        )

    pagination = query.order_by(Purchase.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [p.to_dict(include_items=False, include_payments=False) for p in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------

@purchases_bp.route("/<int:purchase_id>", methods=["GET"])
@require_auth
def get_purchase(purchase_id):
    purchase = Purchase.query.get_or_404(purchase_id)
    return jsonify(purchase.to_dict())


@purchases_bp.route("/by-code/<string:code>", methods=["GET"])
@require_auth
def get_purchase_by_code(code):
    """Look up a purchase by its purchase_code string (e.g. PU-0009)."""
    purchase = Purchase.query.filter(
        Purchase.purchase_code == code.upper(),
        Purchase.tenant_id == TenantContext.get(),
    ).first()
    if not purchase:
        return jsonify({"error": f"Purchase '{code}' not found"}), 404
    return jsonify(purchase.to_dict())


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@purchases_bp.route("", methods=["POST"])
@require_auth
def create_purchase():
    try:
        data = PurchaseSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    items_data = data.pop("items")
    payment_data = data.pop("payment", None)

    for attempt in range(5):
        purchase_code = _generate_purchase_code()
        purchase = Purchase(
            tenant_id=TenantContext.get(),
            purchase_code=purchase_code,
            branch_id=BranchContext.get(),
            supplier_id=data["supplier_id"],
            warehouse_id=data.get("warehouse_id"),
            purchase_date=data.get("purchase_date") or date.today(),
            reference_no=data.get("reference_no"),
            other_charges=data.get("other_charges", 0),
            other_charges_type=data.get("other_charges_type"),
            discount_on_all=data.get("discount_on_all", 0),
            discount_type=data.get("discount_type", "flat"),
            note=data.get("note"),
            status=PurchaseStatus(data.get("status", "received")),
            created_by=getattr(g, "current_user_id", None),
        )

        for item_data in items_data:
            purchase.items.append(
                PurchaseItem(
                    item_id=item_data.get("item_id") or item_data.get("product_id"),
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    purchase_price=item_data["purchase_price"],
                    discount=item_data.get("discount", 0),
                    tax_amount=item_data.get("tax_amount", 0),
                )
            )

        purchase.recalculate_totals()

        # Handle inline payment
        if payment_data and float(payment_data.get("amount", 0)) > 0:
            pmt = PurchasePayment(
                amount=payment_data["amount"],
                payment_type=_parse_payment_type(payment_data.get("payment_type", "cash")),
                account=payment_data.get("account"),
                payment_note=payment_data.get("payment_note"),
                payment_date=payment_data.get("payment_date") or date.today(),
            )
            purchase.payments.append(pmt)
            purchase.amount_paid = float(payment_data["amount"])

        purchase.update_payment_status()
        purchase.add_stock()
        db.session.add(purchase)
        try:
            db.session.commit()
            return jsonify(purchase.to_dict()), 201
        except IntegrityError:
            db.session.rollback()
            continue

    return jsonify({"error": "Unable to generate a purchase code. Please retry."}), 500


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@purchases_bp.route("/<int:purchase_id>", methods=["PUT"])
@require_auth
def update_purchase(purchase_id):
    purchase = Purchase.query.get_or_404(purchase_id)
    try:
        data = PurchaseSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # Reverse stock before re-applying
    purchase.remove_stock()

    items_data = data.pop("items", None)
    data.pop("payment", None)  # payments handled via dedicated endpoint

    for key in (
        "supplier_id", "warehouse_id", "purchase_date", "reference_no",
        "other_charges", "other_charges_type", "discount_on_all", "discount_type", "note",
    ):
        if key in data:
            setattr(purchase, key, data[key])
    if "status" in data:
        purchase.status = PurchaseStatus(data["status"])

    if items_data is not None:
        purchase.items.clear()
        for item_data in items_data:
            purchase.items.append(
                PurchaseItem(
                    item_id=item_data.get("item_id") or item_data.get("product_id"),
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    purchase_price=item_data["purchase_price"],
                    discount=item_data.get("discount", 0),
                    tax_amount=item_data.get("tax_amount", 0),
                )
            )

    purchase.recalculate_totals()
    purchase.update_payment_status()
    purchase.add_stock()
    db.session.commit()
    return jsonify(purchase.to_dict())


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@purchases_bp.route("/<int:purchase_id>", methods=["DELETE"])
@require_auth
def delete_purchase(purchase_id):
    purchase = Purchase.query.get_or_404(purchase_id)
    purchase.remove_stock()
    db.session.delete(purchase)
    db.session.commit()
    return "", 204


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------

@purchases_bp.route("/<int:purchase_id>/payments", methods=["POST"])
@require_auth
def add_payment(purchase_id):
    """Add a new payment record to a purchase."""
    purchase = Purchase.query.get_or_404(purchase_id)
    try:
        data = PurchasePaymentSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    pmt = PurchasePayment(
        purchase_id=purchase.id,
        amount=data["amount"],
        payment_type=_parse_payment_type(data.get("payment_type", "cash")),
        account=data.get("account"),
        payment_note=data.get("payment_note"),
        payment_date=data.get("payment_date") or date.today(),
    )
    db.session.add(pmt)
    db.session.flush()  # persist so the SUM query picks it up

    # Use a direct DB aggregate to avoid stale ORM relationship cache
    total_paid = db.session.query(
        func.coalesce(func.sum(PurchasePayment.amount), 0)
    ).filter_by(purchase_id=purchase.id).scalar()

    purchase.amount_paid = float(total_paid)
    purchase.update_payment_status()
    db.session.commit()

    # Expire and reload so to_dict returns fresh data
    db.session.expire(purchase)
    purchase = Purchase.query.get(purchase_id)
    return jsonify(purchase.to_dict()), 201


@purchases_bp.route("/<int:purchase_id>/payments/<int:payment_id>", methods=["DELETE"])
@require_auth
def delete_payment(purchase_id, payment_id):
    """Remove a payment from a purchase."""
    purchase = Purchase.query.get_or_404(purchase_id)
    pmt = PurchasePayment.query.filter_by(id=payment_id, purchase_id=purchase_id).first_or_404()
    db.session.delete(pmt)
    db.session.flush()  # remove from DB so the SUM query excludes it

    # Use a direct DB aggregate to avoid stale ORM relationship cache
    total_paid = db.session.query(
        func.coalesce(func.sum(PurchasePayment.amount), 0)
    ).filter_by(purchase_id=purchase.id).scalar()

    purchase.amount_paid = float(total_paid)
    purchase.update_payment_status()
    db.session.commit()
    return "", 204
