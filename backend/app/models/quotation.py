# app/models/quotation.py

import enum
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"


def _money(value) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Quotation(TenantScopedMixin, db.Model):
    __tablename__ = "quotations"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "quotation_number", name="uq_quotation_tenant_number"),
    )

    id = db.Column(db.Integer, primary_key=True)
    quotation_number = db.Column(db.String(40), nullable=False)

    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=True)

    issue_date = db.Column(db.Date, default=date.today)
    expiry_date = db.Column(db.Date)

    discount_type = db.Column(db.String(10), default="flat")
    discount_value = db.Column(db.Numeric(12, 2), default=0)

    notes = db.Column(db.Text)
    
    # 🔽 ADD THIS - Terms & Conditions Field 🔽
    terms_conditions = db.Column(db.Text, nullable=True)  # New field for T&C
    
    status = db.Column(db.Enum(QuotationStatus), default=QuotationStatus.DRAFT)

    subtotal = db.Column(db.Numeric(12, 2), default=0)
    tax_total = db.Column(db.Numeric(12, 2), default=0)
    discount_total = db.Column(db.Numeric(12, 2), default=0)
    grand_total = db.Column(db.Numeric(12, 2), default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = db.relationship("Customer", back_populates="quotations")
    warehouse = db.relationship("Warehouse", back_populates="quotations")
    items = db.relationship(
        "QuotationItem", back_populates="quotation", cascade="all, delete-orphan", lazy="joined"
    )

    def recalculate_totals(self) -> None:
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

        if self.discount_type == "percent":
            discount_total = subtotal * (Decimal(self.discount_value or 0) / Decimal("100"))
        else:
            discount_total = Decimal(self.discount_value or 0)

        discount_total = min(discount_total, subtotal)

        self.subtotal = _money(subtotal)
        self.tax_total = _money(tax_total)
        self.discount_total = _money(discount_total)
        self.grand_total = _money(subtotal + tax_total - discount_total)

    def to_dict(self, include_items: bool = True):
        data = {
            "id": self.id,
            "quotation_number": self.quotation_number,
            "customer_id": self.customer_id,
            "warehouse_id": self.warehouse_id,
            "customer": self.customer.to_dict() if self.customer else None,
            "warehouse": self.warehouse.to_dict() if self.warehouse else None,
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "discount_type": self.discount_type,
            "discount_value": float(self.discount_value or 0),
            "notes": self.notes,
            "terms_conditions": self.terms_conditions,  # 🔽 ADD THIS 🔽
            "status": self.status.value if isinstance(self.status, QuotationStatus) else self.status,
            "subtotal": float(self.subtotal or 0),
            "tax_total": float(self.tax_total or 0),
            "discount_total": float(self.discount_total or 0),
            "grand_total": float(self.grand_total or 0),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_items:
            data["items"] = [item.to_dict() for item in self.items]
        return data


class QuotationItem(db.Model):
    __tablename__ = "quotation_items"

    id = db.Column(db.Integer, primary_key=True)
    quotation_id = db.Column(db.Integer, db.ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)

    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=1)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    tax_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)

    line_subtotal = db.Column(db.Numeric(12, 2), default=0)
    line_tax = db.Column(db.Numeric(12, 2), default=0)
    line_total = db.Column(db.Numeric(12, 2), default=0)

    quotation = db.relationship("Quotation", back_populates="items")

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
        }