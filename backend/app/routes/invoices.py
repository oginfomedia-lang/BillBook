from datetime import date

from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Invoice, InvoiceItem, InvoiceStatus, Item, Customer
from app.schemas import InvoiceSchema
from app.tenant_scope import TenantContext
from app.branch_scope import BranchContext, apply_branch_scope
from app.utils.decorators import require_auth

invoices_bp = Blueprint("invoices", __name__, url_prefix="/api/v1/invoices")


def _is_stock_affecting(status: InvoiceStatus) -> bool:
    return status in (InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE)


def restore_invoice_stock(invoice: Invoice) -> None:
    if not _is_stock_affecting(invoice.status):
        return
    for item in invoice.items:
        if item.item_id:
            db_item = db.session.get(Item, item.item_id)
            if db_item and db_item.type == "item":
                db_item.opening_stock = (db_item.opening_stock or 0) + int(item.quantity)


def deduct_invoice_stock(invoice: Invoice) -> None:
    if not _is_stock_affecting(invoice.status):
        return
    for item in invoice.items:
        if item.item_id:
            db_item = db.session.get(Item, item.item_id)
            if db_item and db_item.type == "item":
                db_item.opening_stock = max(0, (db_item.opening_stock or 0) - int(item.quantity))


def _generate_invoice_number() -> str:
    """
    Per-tenant sequential numbering: INV-0001, INV-0002, ...
    Uses the HIGHEST existing sequence number across all invoices, not just
    the most-recently-inserted row's number -- after a data restore/import,
    row insertion order (id) can stop matching numeric-number order, which
    made the old "last row by id" approach regenerate an already-used number
    every time (always the same collision, since nothing changes between
    retries). This still retries on duplicate collisions for concurrent
    workloads, but the collision itself is far less likely now.
    """
    numbers = (
        Invoice.query.filter(Invoice.tenant_id == TenantContext.get())
        .with_entities(Invoice.invoice_number)
        .all()
    )
    seq = 0
    for (number,) in numbers:
        if number and number.startswith("INV-"):
            try:
                seq = max(seq, int(number.split("-", 1)[1]))
            except ValueError:
                continue
    return f"INV-{seq + 1:04d}"


@invoices_bp.route("", methods=["GET"])
@require_auth
def list_invoices():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")
    search = request.args.get("search", "").strip()

    query = Invoice.query
    query = apply_branch_scope(query, Invoice)
    if status:
        query = query.filter(Invoice.status == status)
    if search:
        query = query.join(Invoice.customer).filter(
            db.or_(
                Invoice.invoice_number.ilike(f"%{search}%"),
            )
        )

    pagination = query.order_by(Invoice.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify(
        {
            "items": [inv.to_dict(include_items=False) for inv in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }
    )


@invoices_bp.route("/<int:invoice_id>", methods=["GET"])
@require_auth
def get_invoice(invoice_id):
    invoice = Invoice.query.filter_by(id=invoice_id).first_or_404()
    return jsonify(invoice.to_dict())


@invoices_bp.route("", methods=["POST"])
@require_auth
def create_invoice():
    try:
        data = InvoiceSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    # filter_by() is auto-scoped to the current tenant (see app/tenant_scope.py),
    # so this 404s for a customer_id that exists but belongs to another tenant --
    # closes a cross-tenant IDOR where any customer_id would otherwise be accepted.
    if not Customer.query.filter_by(id=data["customer_id"]).first():
        return jsonify({"error": "Customer not found"}), 404

    items_data = data.pop("items")

    # Extract coupon fields
    coupon_code = data.pop("coupon_code", None)
    coupon_discount = data.pop("coupon_discount", 0)
    data.pop("branch_id", None)                     # 👈 Remove if sent by client

    invoice = None
    for attempt in range(5):
        invoice_number = _generate_invoice_number()
        invoice = Invoice(
            tenant_id=TenantContext.get(),
            invoice_number=invoice_number,
            customer_id=data["customer_id"],
            issue_date=data.get("issue_date") or date.today(),
            due_date=data.get("due_date"),
            discount_type=data.get("discount_type", "flat"),
            discount_value=data.get("discount_value", 0),
            notes=data.get("notes"),
            status=InvoiceStatus(data.get("status", "draft")),
            coupon_code=coupon_code,
            coupon_discount=coupon_discount,
            branch_id=BranchContext.get(),                              # 👈 Added
        )

        for item_data in items_data:
            invoice.items.append(
                InvoiceItem(
                    item_id=item_data.get("item_id") or item_data.get("product_id"),
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    tax_rate=item_data.get("tax_rate", 0),
                )
            )

        invoice.recalculate_totals()
        if invoice.status == InvoiceStatus.PAID:
            invoice.amount_paid = invoice.grand_total

        deduct_invoice_stock(invoice)
        db.session.add(invoice)
        try:
            db.session.commit()
            return jsonify(invoice.to_dict()), 201
        except IntegrityError:
            db.session.rollback()
            continue

    return jsonify({"error": "Unable to generate an invoice number. Please retry."}), 500


@invoices_bp.route("/<int:invoice_id>", methods=["PUT"])
@require_auth
def update_invoice(invoice_id):
    invoice = Invoice.query.filter_by(id=invoice_id).first_or_404()
    try:
        data = InvoiceSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    if "customer_id" in data and not Customer.query.filter_by(id=data["customer_id"]).first():
        return jsonify({"error": "Customer not found"}), 404

    restore_invoice_stock(invoice)

    items_data = data.pop("items", None)

    # Update basic fields
    for key in ("customer_id", "issue_date", "due_date", "discount_type", "discount_value", "notes"):
        if key in data:
            setattr(invoice, key, data[key])

    # Update coupon fields
    if "coupon_code" in data:
        invoice.coupon_code = data["coupon_code"]
    if "coupon_discount" in data:
        invoice.coupon_discount = data["coupon_discount"]

    # Update branch_id if provided
    if BranchContext.get():
        invoice.branch_id = BranchContext.get()

    if "status" in data:
        invoice.status = InvoiceStatus(data["status"])

    if items_data is not None:
        invoice.items.clear()
        for item_data in items_data:
            invoice.items.append(
                InvoiceItem(
                    item_id=item_data.get("item_id") or item_data.get("product_id"),
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    tax_rate=item_data.get("tax_rate", 0),
                )
            )

    invoice.recalculate_totals()
    if invoice.amount_paid and invoice.amount_paid > invoice.grand_total:
        invoice.amount_paid = invoice.grand_total

    if invoice.status == InvoiceStatus.PAID:
        invoice.amount_paid = invoice.grand_total
    elif invoice.amount_paid >= invoice.grand_total:
        invoice.status = InvoiceStatus.PAID
    elif invoice.amount_paid > 0:
        invoice.status = InvoiceStatus.PENDING

    deduct_invoice_stock(invoice)

    db.session.commit()
    return jsonify(invoice.to_dict())


@invoices_bp.route("/<int:invoice_id>", methods=["DELETE"])
@require_auth
def delete_invoice(invoice_id):
    invoice = Invoice.query.filter_by(id=invoice_id).first_or_404()
    restore_invoice_stock(invoice)
    db.session.delete(invoice)
    db.session.commit()
    return "", 204


@invoices_bp.route("/<int:invoice_id>/record-payment", methods=["POST"])
@require_auth
def record_payment(invoice_id):
    """Records a (partial or full) payment against an invoice and updates status."""
    invoice = Invoice.query.filter_by(id=invoice_id).first_or_404()

    # NOTE: We intentionally do NOT touch stock here.
    # Stock is deducted when an invoice transitions from DRAFT to a stock-affecting
    # status (PENDING / PAID / OVERDUE). Recording a payment only changes the
    # payment amount and status — it must never double-deduct or restore stock.

    payload = request.get_json(force=True) or {}
    amount = payload.get("amount")
    payment_mode = payload.get("payment_mode") or "Cash"

    if amount is None or float(amount) <= 0:
        return jsonify({"error": "amount must be a positive number"}), 422

    old_status = invoice.status

    invoice.amount_paid = float(invoice.amount_paid or 0) + float(amount)
    invoice.payment_mode = payment_mode
    if invoice.amount_paid >= float(invoice.grand_total or 0):
        invoice.status = InvoiceStatus.PAID
    else:
        invoice.status = InvoiceStatus.PENDING

    # If the invoice was previously DRAFT/CANCELLED (not stock-affecting) and is
    # now transitioning to a stock-affecting status, deduct stock once.
    if not _is_stock_affecting(old_status) and _is_stock_affecting(invoice.status):
        deduct_invoice_stock(invoice)

    db.session.commit()
    return jsonify(invoice.to_dict())