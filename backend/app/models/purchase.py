"""
Purchase Module Models
======================
Manages supplier purchases, payments, and returns.

Tables:
  purchases            – purchase headers (linked to supplier + warehouse)
  purchase_items       – line items per purchase
  purchase_payments    – payment records per purchase
  purchase_returns     – return headers
  purchase_return_items – line items per return
"""

import enum
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


def _money(value) -> Decimal:
    """Round to 2 decimal places using standard half-up rounding."""
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class PurchaseStatus(str, enum.Enum):
    DRAFT = "draft"
    ORDERED = "ordered"
    RECEIVED = "received"
    PARTIAL = "partial"
    CANCELLED = "cancelled"


class PurchasePaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"


class PurchasePaymentType(str, enum.Enum):
    CASH = "cash"
    BANK = "bank"
    UPI = "upi"
    CHEQUE = "cheque"
    CARD = "card"
    OTHER = "other"


class PurchaseReturnStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ---------------------------------------------------------------------------
# Purchase (Header)
# ---------------------------------------------------------------------------

class Purchase(TenantScopedMixin, db.Model):
    __tablename__ = "purchases"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "purchase_code", name="uq_purchase_tenant_code"),
    )

    id = db.Column(db.Integer, primary_key=True)
    purchase_code = db.Column(db.String(40), nullable=False)

    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=True)

    purchase_date = db.Column(db.Date, default=date.today)
    reference_no = db.Column(db.String(100), nullable=True)

    # Other charges (shipping, handling, etc.)
    other_charges = db.Column(db.Numeric(12, 2), default=0)
    other_charges_type = db.Column(db.String(50), nullable=True)  # e.g. "Shipping", "Handling"

    # Invoice-level discount
    discount_on_all = db.Column(db.Numeric(12, 2), default=0)
    discount_type = db.Column(db.String(10), default="flat")   # "flat" or "percent"

    note = db.Column(db.Text, nullable=True)

    status = db.Column(db.Enum(PurchaseStatus), default=PurchaseStatus.RECEIVED)

    # Stored totals — recalculated server-side
    subtotal = db.Column(db.Numeric(12, 2), default=0)
    tax_total = db.Column(db.Numeric(12, 2), default=0)
    discount_total = db.Column(db.Numeric(12, 2), default=0)
    other_charges_total = db.Column(db.Numeric(12, 2), default=0)
    round_off = db.Column(db.Numeric(12, 2), default=0)
    grand_total = db.Column(db.Numeric(12, 2), default=0)
    amount_paid = db.Column(db.Numeric(12, 2), default=0)

    payment_status = db.Column(
        db.Enum(PurchasePaymentStatus), default=PurchasePaymentStatus.PENDING
    )

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    supplier = db.relationship("Supplier", backref=db.backref("purchases", lazy="dynamic"))
    warehouse = db.relationship("Warehouse", backref=db.backref("purchases", lazy="dynamic"))
    creator = db.relationship("User", foreign_keys=[created_by])
    items = db.relationship(
        "PurchaseItem", back_populates="purchase", cascade="all, delete-orphan", lazy="joined"
    )
    payments = db.relationship(
        "PurchasePayment", back_populates="purchase", cascade="all, delete-orphan", lazy="joined",
        order_by="PurchasePayment.payment_date"
    )
    returns = db.relationship(
        "PurchaseReturn", back_populates="purchase", lazy="dynamic"
    )

    # ------------------------------------------------------------------
    # Business logic
    # ------------------------------------------------------------------

    def recalculate_totals(self) -> None:
        """
        Authoritative server-side total calculation.
        For each line item:
          line_total = qty * purchase_price - discount + tax_amount
        Invoice level:
          subtotal      = sum(qty * purchase_price) (before discount/tax)
          tax_total     = sum(tax_amount per line)
          discount_total = flat or % of subtotal
          other_charges_total = other_charges value
          grand_total   = subtotal + tax_total - discount_total + other_charges_total
        """
        subtotal = Decimal("0")
        tax_total = Decimal("0")

        for item in self.items:
            qty = Decimal(str(item.quantity or 0))
            price = Decimal(str(item.purchase_price or 0))
            discount = Decimal(str(item.discount or 0))
            tax_amt = Decimal(str(item.tax_amount or 0))

            line_base = qty * price
            item.line_total = _money(line_base - discount + tax_amt)
            item.unit_cost = _money(line_base / qty) if qty else Decimal("0")

            subtotal += line_base
            tax_total += tax_amt

        # Invoice discount
        if self.discount_type == "percent":
            discount_total = subtotal * (Decimal(str(self.discount_on_all or 0)) / Decimal("100"))
        else:
            discount_total = Decimal(str(self.discount_on_all or 0))
        discount_total = min(discount_total, subtotal)

        other_charges_total = Decimal(str(self.other_charges or 0))

        raw_grand = subtotal + tax_total - discount_total + other_charges_total
        rounded_grand = _money(raw_grand)
        round_off = rounded_grand - raw_grand

        self.subtotal = _money(subtotal)
        self.tax_total = _money(tax_total)
        self.discount_total = _money(discount_total)
        self.other_charges_total = _money(other_charges_total)
        self.round_off = _money(round_off)
        self.grand_total = rounded_grand

    def update_payment_status(self) -> None:
        """Recompute payment_status from amount_paid vs grand_total."""
        paid = Decimal(str(self.amount_paid or 0))
        total = Decimal(str(self.grand_total or 0))
        if paid <= 0:
            self.payment_status = PurchasePaymentStatus.PENDING
        elif paid >= total:
            self.payment_status = PurchasePaymentStatus.PAID
            self.amount_paid = total
        else:
            self.payment_status = PurchasePaymentStatus.PARTIAL

    def add_stock(self) -> None:
        """Increase product stock when purchase is received."""
        if self.status not in (PurchaseStatus.RECEIVED, PurchaseStatus.PARTIAL):
            return
        from app.models.product import Product
        for item in self.items:
            if item.product_id:
                product = Product.query.get(item.product_id)
                if product:
                    product.stock_quantity = (product.stock_quantity or 0) + int(item.quantity or 0)

    def remove_stock(self) -> None:
        """Reverse stock increase (used before updating/deleting)."""
        if self.status not in (PurchaseStatus.RECEIVED, PurchaseStatus.PARTIAL):
            return
        from app.models.product import Product
        for item in self.items:
            if item.product_id:
                product = Product.query.get(item.product_id)
                if product:
                    product.stock_quantity = max(
                        0, (product.stock_quantity or 0) - int(item.quantity or 0)
                    )

    def to_dict(self, include_items: bool = True, include_payments: bool = True):
        data = {
            "id": self.id,
            "purchase_code": self.purchase_code,
            "supplier_id": self.supplier_id,
            "supplier": self.supplier.to_dict() if self.supplier else None,
            "warehouse_id": self.warehouse_id,
            "warehouse": self.warehouse.to_dict() if self.warehouse else None,
            "purchase_date": self.purchase_date.isoformat() if self.purchase_date else None,
            "reference_no": self.reference_no,
            "other_charges": float(self.other_charges or 0),
            "other_charges_type": self.other_charges_type,
            "discount_on_all": float(self.discount_on_all or 0),
            "discount_type": self.discount_type,
            "note": self.note,
            "status": self.status.value if isinstance(self.status, PurchaseStatus) else self.status,
            "subtotal": float(self.subtotal or 0),
            "tax_total": float(self.tax_total or 0),
            "discount_total": float(self.discount_total or 0),
            "other_charges_total": float(self.other_charges_total or 0),
            "round_off": float(self.round_off or 0),
            "grand_total": float(self.grand_total or 0),
            "amount_paid": float(self.amount_paid or 0),
            "balance_due": float((self.grand_total or 0) - (self.amount_paid or 0)),
            "payment_status": (
                self.payment_status.value
                if isinstance(self.payment_status, PurchasePaymentStatus)
                else self.payment_status
            ),
            "created_by": self.created_by,
            "creator_name": self.creator.name if self.creator else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_items:
            data["items"] = [item.to_dict() for item in self.items]
        if include_payments:
            data["payments"] = [p.to_dict() for p in self.payments]
        return data


# ---------------------------------------------------------------------------
# PurchaseItem (Line items)
# ---------------------------------------------------------------------------

class PurchaseItem(db.Model):
    __tablename__ = "purchase_items"

    id = db.Column(db.Integer, primary_key=True)
    purchase_id = db.Column(
        db.Integer, db.ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False
    )
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)

    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=1)
    purchase_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    discount = db.Column(db.Numeric(12, 2), default=0)         # flat discount per line
    tax_amount = db.Column(db.Numeric(12, 2), default=0)       # tax amount per line
    unit_cost = db.Column(db.Numeric(12, 2), default=0)        # computed: price per unit
    line_total = db.Column(db.Numeric(12, 2), default=0)       # computed total

    purchase = db.relationship("Purchase", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "description": self.description,
            "quantity": float(self.quantity or 0),
            "purchase_price": float(self.purchase_price or 0),
            "discount": float(self.discount or 0),
            "tax_amount": float(self.tax_amount or 0),
            "unit_cost": float(self.unit_cost or 0),
            "line_total": float(self.line_total or 0),
        }


# ---------------------------------------------------------------------------
# PurchasePayment
# ---------------------------------------------------------------------------

class PurchasePayment(db.Model):
    __tablename__ = "purchase_payments"

    id = db.Column(db.Integer, primary_key=True)
    purchase_id = db.Column(
        db.Integer, db.ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False
    )

    amount = db.Column(db.Numeric(12, 2), nullable=False)
    payment_type = db.Column(
        db.Enum(PurchasePaymentType), default=PurchasePaymentType.CASH
    )
    account = db.Column(db.String(150), nullable=True)
    payment_note = db.Column(db.Text, nullable=True)
    payment_date = db.Column(db.Date, default=date.today)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    purchase = db.relationship("Purchase", back_populates="payments")

    def to_dict(self):
        return {
            "id": self.id,
            "purchase_id": self.purchase_id,
            "amount": float(self.amount or 0),
            "payment_type": (
                self.payment_type.value
                if isinstance(self.payment_type, PurchasePaymentType)
                else self.payment_type
            ),
            "account": self.account,
            "payment_note": self.payment_note,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# PurchaseReturn (Header)
# ---------------------------------------------------------------------------

class PurchaseReturn(TenantScopedMixin, db.Model):
    __tablename__ = "purchase_returns"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "return_code", name="uq_purchase_return_tenant_code"),
    )

    id = db.Column(db.Integer, primary_key=True)
    return_code = db.Column(db.String(40), nullable=False)

    purchase_id = db.Column(db.Integer, db.ForeignKey("purchases.id"), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=True)

    return_date = db.Column(db.Date, default=date.today)
    reference_no = db.Column(db.String(100), nullable=True)
    note = db.Column(db.Text, nullable=True)

    status = db.Column(db.Enum(PurchaseReturnStatus), default=PurchaseReturnStatus.COMPLETED)

    subtotal = db.Column(db.Numeric(12, 2), default=0)
    tax_total = db.Column(db.Numeric(12, 2), default=0)
    grand_total = db.Column(db.Numeric(12, 2), default=0)
    amount_paid = db.Column(db.Numeric(12, 2), default=0)

    payment_status = db.Column(
        db.Enum(PurchasePaymentStatus), default=PurchasePaymentStatus.PENDING
    )

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    purchase = db.relationship("Purchase", back_populates="returns")
    supplier = db.relationship("Supplier", backref=db.backref("purchase_returns", lazy="dynamic"))
    warehouse = db.relationship("Warehouse", backref=db.backref("purchase_returns", lazy="dynamic"))
    creator = db.relationship("User", foreign_keys=[created_by])
    items = db.relationship(
        "PurchaseReturnItem", back_populates="return_order",
        cascade="all, delete-orphan", lazy="joined"
    )

    def recalculate_totals(self) -> None:
        subtotal = Decimal("0")
        tax_total = Decimal("0")
        for item in self.items:
            qty = Decimal(str(item.quantity or 0))
            price = Decimal(str(item.purchase_price or 0))
            tax_amt = Decimal(str(item.tax_amount or 0))
            item.line_total = _money(qty * price + tax_amt)
            subtotal += qty * price
            tax_total += tax_amt
        self.subtotal = _money(subtotal)
        self.tax_total = _money(tax_total)
        self.grand_total = _money(subtotal + tax_total)

    def to_dict(self, include_items: bool = True):
        data = {
            "id": self.id,
            "return_code": self.return_code,
            "purchase_id": self.purchase_id,
            "purchase_code": self.purchase.purchase_code if self.purchase else None,
            "supplier_id": self.supplier_id,
            "supplier": self.supplier.to_dict() if self.supplier else None,
            "warehouse_id": self.warehouse_id,
            "warehouse": self.warehouse.to_dict() if self.warehouse else None,
            "return_date": self.return_date.isoformat() if self.return_date else None,
            "reference_no": self.reference_no,
            "note": self.note,
            "status": (
                self.status.value if isinstance(self.status, PurchaseReturnStatus) else self.status
            ),
            "subtotal": float(self.subtotal or 0),
            "tax_total": float(self.tax_total or 0),
            "grand_total": float(self.grand_total or 0),
            "amount_paid": float(self.amount_paid or 0),
            "balance_due": float((self.grand_total or 0) - (self.amount_paid or 0)),
            "payment_status": (
                self.payment_status.value
                if isinstance(self.payment_status, PurchasePaymentStatus)
                else self.payment_status
            ),
            "created_by": self.created_by,
            "creator_name": self.creator.name if self.creator else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_items:
            data["items"] = [item.to_dict() for item in self.items]
        return data


# ---------------------------------------------------------------------------
# PurchaseReturnItem
# ---------------------------------------------------------------------------

class PurchaseReturnItem(db.Model):
    __tablename__ = "purchase_return_items"

    id = db.Column(db.Integer, primary_key=True)
    return_id = db.Column(
        db.Integer, db.ForeignKey("purchase_returns.id", ondelete="CASCADE"), nullable=False
    )
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)

    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=1)
    purchase_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(12, 2), default=0)
    line_total = db.Column(db.Numeric(12, 2), default=0)

    return_order = db.relationship("PurchaseReturn", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "description": self.description,
            "quantity": float(self.quantity or 0),
            "purchase_price": float(self.purchase_price or 0),
            "tax_amount": float(self.tax_amount or 0),
            "line_total": float(self.line_total or 0),
        }
