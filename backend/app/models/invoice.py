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
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)

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
    # GST split of tax_total. Populated by recalculate_totals() based on
    # whether the sale is intra-state (CGST+SGST) or inter-state (IGST) —
    # see _is_interstate_sale(). tax_total always equals their sum.
    cgst_total = db.Column(db.Numeric(12, 2), default=0)
    sgst_total = db.Column(db.Numeric(12, 2), default=0)
    igst_total = db.Column(db.Numeric(12, 2), default=0)
    discount_total = db.Column(db.Numeric(12, 2), default=0)
    grand_total = db.Column(db.Numeric(12, 2), default=0)
    amount_paid = db.Column(db.Numeric(12, 2), default=0)
    payment_mode = db.Column(db.String(50), default="Cash")

    # Coupon fields
    coupon_code = db.Column(db.String(50), nullable=True)
    coupon_discount = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    # ✅ ADD THIS - Created By
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    creator = db.relationship("User", foreign_keys=[created_by], lazy=True)

    branch = db.relationship("Branch", back_populates="invoices")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = db.relationship("Customer", back_populates="invoices")
    
    items = db.relationship(
        "InvoiceItem", back_populates="invoice", cascade="all, delete-orphan", lazy="joined"
    )

    def _is_interstate_sale(self) -> bool:
        """
        GST place-of-supply check: a sale is inter-state (IGST) when the
        customer's GSTIN state code (first 2 digits) differs from the
        tenant's own GSTIN state code. If either party has no GSTIN on
        file, we can't tell — default to intra-state (CGST+SGST), which
        matches how unregistered/B2C sales are normally treated.
        """
        from app.models.tenant import Tenant
        from app.models.customer import Customer

        # Query directly by id rather than via self.customer — at the point
        # this runs (recalculate_totals during create_invoice) the invoice
        # may not be attached to the session yet, so the relationship isn't
        # guaranteed to be loaded even though customer_id is already set.
        tenant = db.session.get(Tenant, self.tenant_id)
        customer = db.session.get(Customer, self.customer_id) if self.customer_id else None
        tenant_gstin = (tenant.gstin or "").strip() if tenant else ""
        customer_gstin = (customer.gstin or "").strip() if customer else ""

        if len(tenant_gstin) >= 2 and len(customer_gstin) >= 2:
            return tenant_gstin[:2] != customer_gstin[:2]
        return False

    def recalculate_totals(self) -> None:
        """
        Authoritative server-side total calculation.
        Combines manual discount and coupon discount.
        """
        subtotal = Decimal("0")
        tax_total = Decimal("0")
        cgst_total = Decimal("0")
        sgst_total = Decimal("0")
        igst_total = Decimal("0")

        is_interstate = self._is_interstate_sale()

        for item in self.items:
            qty = Decimal(item.quantity or 0)
            price = Decimal(item.unit_price or 0)
            rate = Decimal(item.tax_rate or 0)

            line_subtotal = qty * price
            line_tax = line_subtotal * (rate / Decimal("100"))

            item.line_subtotal = _money(line_subtotal)
            item.line_tax = _money(line_tax)
            item.line_total = _money(line_subtotal + line_tax)

            if is_interstate:
                item.line_igst = item.line_tax
                item.line_cgst = Decimal("0.00")
                item.line_sgst = Decimal("0.00")
            else:
                half = _money(item.line_tax / 2)
                item.line_cgst = half
                # remainder (not just half again) so the two halves always
                # sum back exactly to line_tax despite rounding
                item.line_sgst = _money(item.line_tax - half)
                item.line_igst = Decimal("0.00")

            subtotal += line_subtotal
            tax_total += line_tax
            cgst_total += item.line_cgst
            sgst_total += item.line_sgst
            igst_total += item.line_igst

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
        self.cgst_total = _money(cgst_total)
        self.sgst_total = _money(sgst_total)
        self.igst_total = _money(igst_total)
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
            "cgst_total": float(self.cgst_total or 0),
            "sgst_total": float(self.sgst_total or 0),
            "igst_total": float(self.igst_total or 0),
            "discount_total": float(self.discount_total or 0),
            "grand_total": float(self.grand_total or 0),
            "amount_paid": float(self.amount_paid or 0),
            "payment_mode": self.payment_mode,
            "balance_due": float((self.grand_total or 0) - (self.amount_paid or 0)),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "coupon_code": self.coupon_code,
            "coupon_discount": float(self.coupon_discount or 0),
            "created_by": self.created_by,  # ✅ ADD THIS
        }
        if include_items:
            data["items"] = [item.to_dict() for item in self.items]
        return data


class InvoiceItem(db.Model):
    __tablename__ = "invoice_items"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=True)

    @property
    def product_id(self):
        return self.item_id

    @product_id.setter
    def product_id(self, value):
        self.item_id = value

    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=1)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    tax_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)

    line_subtotal = db.Column(db.Numeric(12, 2), default=0)
    line_tax = db.Column(db.Numeric(12, 2), default=0)
    line_cgst = db.Column(db.Numeric(12, 2), default=0)
    line_sgst = db.Column(db.Numeric(12, 2), default=0)
    line_igst = db.Column(db.Numeric(12, 2), default=0)
    line_total = db.Column(db.Numeric(12, 2), default=0)

    invoice = db.relationship("Invoice", back_populates="items")

    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    branch = db.relationship("Branch", back_populates="invoice_items")

    def to_dict(self):
        return {
            "id": self.id,
            "item_id": self.item_id,
            "product_id": self.item_id,  # Product compatibility
            "description": self.description,
            "quantity": float(self.quantity or 0),
            "unit_price": float(self.unit_price or 0),
            "tax_rate": float(self.tax_rate or 0),
            "line_subtotal": float(self.line_subtotal or 0),
            "line_tax": float(self.line_tax or 0),
            "line_cgst": float(self.line_cgst or 0),
            "line_sgst": float(self.line_sgst or 0),
            "line_igst": float(self.line_igst or 0),
            "line_total": float(self.line_total or 0),
            "branch_id": self.branch_id,
        }