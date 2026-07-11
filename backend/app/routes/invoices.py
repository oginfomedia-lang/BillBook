from datetime import date

from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Invoice, InvoiceItem, InvoiceStatus, Product
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
        if item.product_id:
            product = Product.query.get(item.product_id)
            if product:
                product.stock_quantity = (product.stock_quantity or 0) + item.quantity


def deduct_invoice_stock(invoice: Invoice) -> None:
    if not _is_stock_affecting(invoice.status):
        return
    for item in invoice.items:
        if item.product_id:
            product = Product.query.get(item.product_id)
            if product:
                product.stock_quantity = (product.stock_quantity or 0) - item.quantity


def _generate_invoice_number() -> str:
    """
    Per-tenant sequential numbering: INV-0001, INV-0002, ...
    This uses the latest inserted invoice number and retries on duplicate
    collisions to reduce race condition failures in concurrent workloads.
    """
    last_number = (
        Invoice.query.filter(Invoice.tenant_id == TenantContext.get())
        .order_by(Invoice.id.desc())
        .with_entities(Invoice.invoice_number)
        .limit(1)
        .scalar()
    )
    if last_number and last_number.startswith("INV-"):
        try:
            seq = int(last_number.split("-", 1)[1])
        except ValueError:
            seq = 0
    else:
        seq = 0
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
    invoice = Invoice.query.get_or_404(invoice_id)
    return jsonify(invoice.to_dict())


@invoices_bp.route("", methods=["POST"])
@require_auth
def create_invoice():
    try:
        data = InvoiceSchema().load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

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
                    product_id=item_data.get("product_id"),
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
    invoice = Invoice.query.get_or_404(invoice_id)
    try:
        data = InvoiceSchema(partial=True).load(request.get_json(force=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

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
                    product_id=item_data.get("product_id"),
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
    invoice = Invoice.query.get_or_404(invoice_id)
    restore_invoice_stock(invoice)
    db.session.delete(invoice)
    db.session.commit()
    return "", 204


@invoices_bp.route("/<int:invoice_id>/record-payment", methods=["POST"])
@require_auth
def record_payment(invoice_id):
    """Records a (partial or full) payment against an invoice and updates status."""
    invoice = Invoice.query.get_or_404(invoice_id)
    restore_invoice_stock(invoice)

    payload = request.get_json(force=True) or {}
    amount = payload.get("amount")
    payment_mode = payload.get("payment_mode") or "Cash"

    if amount is None or float(amount) <= 0:
        return jsonify({"error": "amount must be a positive number"}), 422

    invoice.amount_paid = float(invoice.amount_paid or 0) + float(amount)
    invoice.payment_mode = payment_mode
    if invoice.amount_paid >= float(invoice.grand_total or 0):
        invoice.status = InvoiceStatus.PAID
    else:
        invoice.status = InvoiceStatus.PENDING

    deduct_invoice_stock(invoice)

    db.session.commit()
    return jsonify(invoice.to_dict())