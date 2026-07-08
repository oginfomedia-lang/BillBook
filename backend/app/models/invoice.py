import enum
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


def _money(value) -> Decimal:
    """Round to 2 decimal places using standard half-up rounding for currency."""
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Invoice(TenantScopedMixin, db.Model):
    __tablename__ = "invoices"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "invoice_number", name="uq_invoice_tenant_number"),
    )

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(40), nullable=False)

    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)  # ← ADD THIS

    issue_date = db.Column(db.Date, default=date.today)
    due_date = db.Column(db.Date)

    # Invoice-level discount, applied AFTER summing line items.
    discount_type = db.Column(db.String(10), default="flat")  # "flat" or "percent"
    discount_value = db.Column(db.Numeric(12, 2), default=0)

    notes = db.Column(db.Text)
    status = db.Column(db.Enum(InvoiceStatus), default=InvoiceStatus.DRAFT)

    # Stored totals — recalculated server-side on every create/update,
    # never trusted from client input. See recalculate_totals().
    subtotal = db.Column(db.Numeric(12, 2), default=0)
    tax_total = db.Column(db.Numeric(12, 2), default=0)
    discount_total = db.Column(db.Numeric(12, 2), default=0)
    grand_total = db.Column(db.Numeric(12, 2), default=0)
    amount_paid = db.Column(db.Numeric(12, 2), default=0)
    payment_mode = db.Column(db.String(50), default="Cash")

    # Coupon fields
    coupon_code = db.Column(db.String(50), nullable=True)
    coupon_discount = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = db.relationship("Customer", back_populates="invoices")
    branch = db.relationship("Branch", back_populates="invoices")  # ← ADD THIS
    
    items = db.relationship(
        "InvoiceItem", back_populates="invoice", cascade="all, delete-orphan", lazy="joined"
    )

    def recalculate_totals(self) -> None:
        """
        Authoritative server-side total calculation.
        Combines manual discount and coupon discount.
        """
        subtotal = Decimal("0")
        tax_total = Decimal("0")

        for item in self.items:
            qty = Decimal(item.quantity or 0)
            price = Decimal(item.unit_price or 0)
            rate = Decimal(item.tax_rate or 0)

            line_subtotal = qty * price
            line_tax = line_subtotal * (rate / Decimal("100"))

            item.line_subtotal = _money(line_subtotal)
            item.line_tax = _money(line_tax)
            item.line_total = _money(line_subtotal + line_tax)

            subtotal += line_subtotal
            tax_total += line_tax

        # Manual discount
        if self.discount_type == "percent":
            manual_discount = subtotal * (Decimal(self.discount_value or 0) / Decimal("100"))
        else:
            manual_discount = Decimal(self.discount_value or 0)

        # Coupon discount
        coupon_discount = Decimal(self.coupon_discount or 0)

        # Total discount (capped at subtotal)
        total_discount = manual_discount + coupon_discount
        total_discount = min(total_discount, subtotal)

        self.subtotal = _money(subtotal)
        self.tax_total = _money(tax_total)
        self.discount_total = _money(total_discount)
        self.grand_total = _money(subtotal + tax_total - total_discount)

    def to_dict(self, include_items: bool = True):
        data = {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "customer_id": self.customer_id,
            "customer": self.customer.to_dict() if self.customer else None,
            "branch_id": self.branch_id,
            "branch": self.branch.to_dict() if self.branch else None,
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "discount_type": self.discount_type,
            "discount_value": float(self.discount_value or 0),
            "notes": self.notes,
            "status": self.status.value if isinstance(self.status, InvoiceStatus) else self.status,
            "subtotal": float(self.subtotal or 0),
            "tax_total": float(self.tax_total or 0),
            "discount_total": float(self.discount_total or 0),
            "grand_total": float(self.grand_total or 0),
            "amount_paid": float(self.amount_paid or 0),
            "payment_mode": self.payment_mode,
            "balance_due": float((self.grand_total or 0) - (self.amount_paid or 0)),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "coupon_code": self.coupon_code,
            "coupon_discount": float(self.coupon_discount or 0),
        }
        if include_items:
            data["items"] = [item.to_dict() for item in self.items]
        return data


class InvoiceItem(db.Model):
    __tablename__ = "invoice_items"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)

    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=1)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    tax_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)

    line_subtotal = db.Column(db.Numeric(12, 2), default=0)
    line_tax = db.Column(db.Numeric(12, 2), default=0)
    line_total = db.Column(db.Numeric(12, 2), default=0)

    # ✅ CORRECT - Invoice relationship
    invoice = db.relationship("Invoice", back_populates="items")

    # ✅ CORRECT - Branch relationship
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    branch = db.relationship("Branch", back_populates="invoice_items")  # ← This matches Branch.invoice_items

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "description": self.description,
            "quantity": float(self.quantity or 0),
            "unit_price": float(self.unit_price or 0),
            "tax_rate": float(self.tax_rate or 0),
            "line_subtotal": float(self.line_subtotal or 0),
            "line_tax": float(self.line_tax or 0),
            "line_total": float(self.line_total or 0),
            "branch_id": self.branch_id,
        }