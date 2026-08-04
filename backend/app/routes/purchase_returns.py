"""
Purchase Returns Routes
=======================
Endpoints for managing returns of goods to suppliers.
"""

from datetime import date

from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.purchase import (
    PurchaseReturn, PurchaseReturnItem, PurchaseReturnStatus, PurchasePaymentStatus,
)
from app.schemas.purchase_schemas import PurchaseReturnSchema
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth

purchase_returns_bp = Blueprint(
    "purchase_returns", __name__, url_prefix="/api/v1/purchase-returns"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_return_code() -> str:
    """Per-tenant sequential code: PR-0001, PR-0002, …"""
    last = (
        PurchaseReturn.query.filter(PurchaseReturn.tenant_id == TenantContext.get())
        .order_by(PurchaseReturn.id.desc())
        .with_entities(PurchaseReturn.return_code)
        .limit(1)
        .scalar()
    )
    if last and last.startswith("PR-"):
        try:
            seq = int(last.split("-", 1)[1])
        except ValueError:
            seq = 0
    else:
        seq = 0
    return f"PR-{seq + 1:04d}"


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@purchase_returns_bp.route("/stats", methods=["GET"])
@require_auth
def get_return_stats():
    warehouse_id = request.args.get("warehouse_id", type=int)

    q = PurchaseReturn.query
    q = apply_branch_scope(q, PurchaseReturn)
    if warehouse_id:
        q = q.filter(PurchaseReturn.warehouse_id == warehouse_id)

    total_invoices = q.count()
    agg = q.with_entities(
        func.coalesce(func.sum(PurchaseReturn.grand_total), 0).label("total_amount"),
        func.coalesce(func.sum(PurchaseReturn.amount_paid), 0).label("total_paid"),
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

@purchase_returns_bp.route("", methods=["GET"])
@require_auth
def list_purchase_returns():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    warehouse_id = request.args.get("warehouse_id", type=int)
    status = request.args.get("status")
    search = request.args.get("search", "").strip()

    query = PurchaseReturn.query
    query = apply_branch_scope(query, PurchaseReturn)
    if warehouse_id:
        query = query.filter(PurchaseReturn.warehouse_id == warehouse_id)
    if status:
        query = query.filter(PurchaseReturn.status == status)
    if search:
        from app.models.supplier import Supplier
        query = query.join(PurchaseReturn.supplier).filter(
            db.or_(
                PurchaseReturn.return_code.ilike(f"%{search}%"),
                PurchaseReturn.reference_no.ilike(f"%{search}%"),
                Supplier.name.ilike(f"%{search}%"),
            )
        )

    pagination = query.order_by(PurchaseReturn.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [r.to_dict(include_items=False) for r in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------

@purchase_returns_bp.route("/<int:return_id>", methods=["GET"])
@require_auth
def get_purchase_return(return_id):
    ret = PurchaseReturn.query.filter_by(id=return_id).first_or_404()
    return jsonify(ret.to_dict())


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@purchase_returns_bp.route("", methods=["POST"])
@require_auth
def create_purchase_return():
    try:
        data = PurchaseReturnSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    items_data = data.pop("items")

    # Resolve supplier/warehouse from parent purchase if not provided
    from app.models.purchase import Purchase
    parent_purchase = Purchase.query.filter_by(id=data["purchase_id"]).first()
    supplier_id = data.get("supplier_id") or (parent_purchase.supplier_id if parent_purchase else None)
    warehouse_id = data.get("warehouse_id") or (parent_purchase.warehouse_id if parent_purchase else None)

    for attempt in range(5):
        return_code = _generate_return_code()
        ret = PurchaseReturn(
            tenant_id=TenantContext.get(),
            branch_id=BranchContext.get(),
            return_code=return_code,
            purchase_id=data["purchase_id"],
            supplier_id=supplier_id,
            warehouse_id=warehouse_id,
            return_date=data.get("return_date") or date.today(),
            reference_no=data.get("reference_no"),
            note=data.get("note"),
            status=PurchaseReturnStatus(data.get("status", "completed")),
            created_by=getattr(g, "current_user_id", None),
        )

        for item_data in items_data:
            ret.items.append(
                PurchaseReturnItem(
                    item_id=item_data.get("item_id") or item_data.get("product_id"),
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    purchase_price=item_data["purchase_price"],
                    tax_amount=item_data.get("tax_amount", 0),
                )
            )

        ret.recalculate_totals()

        # Reduce stock for returned items (goods physically go back to supplier)
        from app.models.item import Item
        for item in ret.items:
            if item.item_id:
                db_item = db.session.get(Item, item.item_id)
                if db_item and db_item.type == "item":
                    db_item.opening_stock = max(
                        0, (db_item.opening_stock or 0) - int(item.quantity or 0)
                    )

        db.session.add(ret)
        try:
            db.session.commit()
            return jsonify(ret.to_dict()), 201
        except IntegrityError:
            db.session.rollback()
            continue

    return jsonify({"error": "Unable to generate a return code. Please retry."}), 500


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@purchase_returns_bp.route("/<int:return_id>", methods=["DELETE"])
@require_auth
def delete_purchase_return(return_id):
    ret = PurchaseReturn.query.filter_by(id=return_id).first_or_404()

    # Restore stock (goods are back, return is undone)
    from app.models.item import Item
    for item in ret.items:
        if item.item_id:
            db_item = db.session.get(Item, item.item_id)
            if db_item and db_item.type == "item":
                db_item.opening_stock = (db_item.opening_stock or 0) + int(item.quantity or 0)

    db.session.delete(ret)
    db.session.commit()
    return "", 204
