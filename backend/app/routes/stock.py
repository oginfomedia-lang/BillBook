"""
Stock Module Routes
===================
Handles Stock Adjustments and Stock Transfers CRUD operations.
"""

from datetime import date
from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, validate, ValidationError

from app.extensions import db
from app.models import (
    StockAdjustment, StockAdjustmentItem,
    StockTransfer, StockTransferItem,
    Warehouse, Item,
)
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth

stock_bp = Blueprint("stock", __name__, url_prefix="/api/v1/stock")


# ---------------------------------------------------------------------------
# Stock helper functions
# ---------------------------------------------------------------------------

def _apply_adjustment_stock(adj) -> None:
    """Apply stock change for a StockAdjustment (call after saving items)."""
    is_addition = adj.adjustment_type == "addition"
    for adj_item in adj.items.all():
        if not adj_item.item_id:
            continue
        db_item = db.session.get(Item, adj_item.item_id)
        if db_item and db_item.type == "item":
            qty = int(adj_item.quantity or 0)
            if is_addition:
                db_item.opening_stock = (db_item.opening_stock or 0) + qty
            else:
                db_item.opening_stock = max(0, (db_item.opening_stock or 0) - qty)


def _reverse_adjustment_stock(adj) -> None:
    """Reverse a previously applied StockAdjustment (call before deleting/updating)."""
    is_addition = adj.adjustment_type == "addition"
    for adj_item in adj.items.all():
        if not adj_item.item_id:
            continue
        db_item = db.session.get(Item, adj_item.item_id)
        if db_item and db_item.type == "item":
            qty = int(adj_item.quantity or 0)
            # Reverse: undo addition → subtract; undo subtraction → add back
            if is_addition:
                db_item.opening_stock = max(0, (db_item.opening_stock or 0) - qty)
            else:
                db_item.opening_stock = (db_item.opening_stock or 0) + qty


def _apply_transfer_stock(tr) -> None:
    """Apply stock movement for a StockTransfer (deduct source, add destination)."""
    for tr_item in tr.items.all():
        if not tr_item.item_id:
            continue
        db_item = db.session.get(Item, tr_item.item_id)
        if db_item and db_item.type == "item":
            qty = int(tr_item.quantity or 0)
            db_item.opening_stock = max(0, (db_item.opening_stock or 0) - qty)


def _reverse_transfer_stock(tr) -> None:
    """Reverse a previously applied StockTransfer."""
    for tr_item in tr.items.all():
        if not tr_item.item_id:
            continue
        db_item = db.session.get(Item, tr_item.item_id)
        if db_item and db_item.type == "item":
            qty = int(tr_item.quantity or 0)
            db_item.opening_stock = (db_item.opening_stock or 0) + qty


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AdjustmentItemSchema(Schema):
    id = fields.Integer(dump_only=True)
    item_id = fields.Integer(required=True)
    quantity = fields.Decimal(places=2, required=True)
    unit_cost = fields.Decimal(places=2, allow_none=True)


class StockAdjustmentSchema(Schema):
    id = fields.Integer(dump_only=True)
    reference_no = fields.String(allow_none=True, validate=validate.Length(max=100))
    adjustment_date = fields.Date(allow_none=True)
    warehouse_id = fields.Integer(allow_none=True)
    adjustment_type = fields.String(
        validate=validate.OneOf(["addition", "subtraction"]),
        load_default="addition",
    )
    notes = fields.String(allow_none=True)
    items = fields.List(fields.Nested(AdjustmentItemSchema), load_default=[])


class TransferItemSchema(Schema):
    id = fields.Integer(dump_only=True)
    item_id = fields.Integer(required=True)
    quantity = fields.Decimal(places=2, required=True)


class StockTransferSchema(Schema):
    id = fields.Integer(dump_only=True)
    transfer_date = fields.Date(allow_none=True)
    from_warehouse_id = fields.Integer(required=True)
    to_warehouse_id = fields.Integer(required=True)
    notes = fields.String(allow_none=True)
    items = fields.List(fields.Nested(TransferItemSchema), load_default=[])


# ---------------------------------------------------------------------------
# Stock Adjustments
# ---------------------------------------------------------------------------

@stock_bp.route("/adjustments", methods=["GET"])
@require_auth
def list_adjustments():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    warehouse_id = request.args.get("warehouse_id", type=int)

    query = StockAdjustment.query.order_by(StockAdjustment.adjustment_date.desc(), StockAdjustment.id.desc())
    query = apply_branch_scope(query, StockAdjustment)

    if search:
        query = query.filter(StockAdjustment.reference_no.ilike(f"%{search}%"))
    if warehouse_id:
        query = query.filter(StockAdjustment.warehouse_id == warehouse_id)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "adjustments": [a.to_dict() for a in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
        "per_page": per_page,
    })


@stock_bp.route("/adjustments/<int:adj_id>", methods=["GET"])
@require_auth
def get_adjustment(adj_id):
    adj = StockAdjustment.query.filter_by(id=adj_id).first_or_404()
    return jsonify(adj.to_dict(include_items=True))


@stock_bp.route("/adjustments", methods=["POST"])
@require_auth
def create_adjustment():
    try:
        data = StockAdjustmentSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    adj = StockAdjustment(
        tenant_id=TenantContext.get(),
        branch_id=BranchContext.get(),
        reference_no=data.get("reference_no"),
        adjustment_date=data.get("adjustment_date") or date.today(),
        warehouse_id=data.get("warehouse_id"),
        adjustment_type=data.get("adjustment_type", "addition"),
        notes=data.get("notes"),
        created_by_id=g.current_user.id if hasattr(g, "current_user") and g.current_user else None,
    )
    db.session.add(adj)
    db.session.flush()  # get adj.id

    for item_data in data.get("items", []):
        adj_item = StockAdjustmentItem(
            adjustment_id=adj.id,
            item_id=item_data["item_id"],
            quantity=item_data["quantity"],
            unit_cost=item_data.get("unit_cost"),
        )
        db.session.add(adj_item)

    db.session.flush()  # ensure items have IDs before applying stock
    _apply_adjustment_stock(adj)
    db.session.commit()
    return jsonify(adj.to_dict(include_items=True)), 201


@stock_bp.route("/adjustments/<int:adj_id>", methods=["PUT"])
@require_auth
def update_adjustment(adj_id):
    adj = StockAdjustment.query.filter_by(id=adj_id).first_or_404()
    try:
        data = StockAdjustmentSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # Reverse the stock effect of the old adjustment before making changes
    _reverse_adjustment_stock(adj)

    for key in ("reference_no", "adjustment_date", "warehouse_id", "adjustment_type", "notes"):
        if key in data:
            setattr(adj, key, data[key])

    # Replace items if provided
    if "items" in data:
        for old in adj.items.all():
            db.session.delete(old)
        db.session.flush()
        for item_data in data["items"]:
            adj_item = StockAdjustmentItem(
                adjustment_id=adj.id,
                item_id=item_data["item_id"],
                quantity=item_data["quantity"],
                unit_cost=item_data.get("unit_cost"),
            )
            db.session.add(adj_item)
        db.session.flush()

    # Apply the new stock effect
    _apply_adjustment_stock(adj)
    db.session.commit()
    return jsonify(adj.to_dict(include_items=True))


@stock_bp.route("/adjustments/<int:adj_id>", methods=["DELETE"])
@require_auth
def delete_adjustment(adj_id):
    adj = StockAdjustment.query.filter_by(id=adj_id).first_or_404()
    # Reverse stock before deleting
    _reverse_adjustment_stock(adj)
    db.session.delete(adj)
    db.session.commit()
    return jsonify({"message": "Stock adjustment deleted successfully"}), 200


# ---------------------------------------------------------------------------
# Stock Transfers
# ---------------------------------------------------------------------------

@stock_bp.route("/transfers", methods=["GET"])
@require_auth
def list_transfers():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()

    query = StockTransfer.query.order_by(StockTransfer.transfer_date.desc(), StockTransfer.id.desc())
    query = apply_branch_scope(query, StockTransfer)

    if search:
        # search by notes
        query = query.filter(StockTransfer.notes.ilike(f"%{search}%"))

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "transfers": [t.to_dict() for t in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
        "per_page": per_page,
    })


@stock_bp.route("/transfers/<int:tr_id>", methods=["GET"])
@require_auth
def get_transfer(tr_id):
    tr = StockTransfer.query.filter_by(id=tr_id).first_or_404()
    return jsonify(tr.to_dict(include_items=True))


@stock_bp.route("/transfers", methods=["POST"])
@require_auth
def create_transfer():
    try:
        data = StockTransferSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if data["from_warehouse_id"] == data["to_warehouse_id"]:
        return jsonify({"error": "Source and destination warehouse must be different"}), 400

    tr = StockTransfer(
        tenant_id=TenantContext.get(),
        branch_id=BranchContext.get(),
        transfer_date=data.get("transfer_date") or date.today(),
        from_warehouse_id=data["from_warehouse_id"],
        to_warehouse_id=data["to_warehouse_id"],
        notes=data.get("notes"),
        created_by_id=g.current_user.id if hasattr(g, "current_user") and g.current_user else None,
    )
    db.session.add(tr)
    db.session.flush()

    for item_data in data.get("items", []):
        tr_item = StockTransferItem(
            transfer_id=tr.id,
            item_id=item_data["item_id"],
            quantity=item_data["quantity"],
        )
        db.session.add(tr_item)

    db.session.flush()  # ensure items have IDs
    _apply_transfer_stock(tr)
    db.session.commit()
    return jsonify(tr.to_dict(include_items=True)), 201


@stock_bp.route("/transfers/<int:tr_id>", methods=["PUT"])
@require_auth
def update_transfer(tr_id):
    tr = StockTransfer.query.filter_by(id=tr_id).first_or_404()
    try:
        data = StockTransferSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if (
        "from_warehouse_id" in data
        and "to_warehouse_id" in data
        and data["from_warehouse_id"] == data["to_warehouse_id"]
    ):
        return jsonify({"error": "Source and destination warehouse must be different"}), 400

    # Reverse stock effect of the old transfer before applying new one
    _reverse_transfer_stock(tr)

    for key in ("transfer_date", "from_warehouse_id", "to_warehouse_id", "notes"):
        if key in data:
            setattr(tr, key, data[key])

    if "items" in data:
        for old in tr.items.all():
            db.session.delete(old)
        db.session.flush()
        for item_data in data["items"]:
            tr_item = StockTransferItem(
                transfer_id=tr.id,
                item_id=item_data["item_id"],
                quantity=item_data["quantity"],
            )
            db.session.add(tr_item)
        db.session.flush()

    _apply_transfer_stock(tr)
    db.session.commit()
    return jsonify(tr.to_dict(include_items=True))


@stock_bp.route("/transfers/<int:tr_id>", methods=["DELETE"])
@require_auth
def delete_transfer(tr_id):
    tr = StockTransfer.query.filter_by(id=tr_id).first_or_404()
    # Restore the stock that was moved in this transfer
    _reverse_transfer_stock(tr)
    db.session.delete(tr)
    db.session.commit()
    return jsonify({"message": "Stock transfer deleted successfully"}), 200
