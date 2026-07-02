import enum
from datetime import datetime
from decimal import Decimal

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class PaymentType(str, enum.Enum):
    CASH = "cash"
    BANK = "bank"
    CHEQUE = "cheque"
    ONLINE = "online"


class AdvancePaymentStatus(str, enum.Enum):
    PENDING = "pending"
    APPLIED = "applied"
    CANCELLED = "cancelled"


class AdvancePayment(TenantScopedMixin, db.Model):
    __tablename__ = "advance_payments"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "advance_number", name="uq_advance_tenant_number"),
    )

    id = db.Column(db.Integer, primary_key=True)
    advance_number = db.Column(db.String(40), nullable=False)

    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)

    amount = db.Column(db.Numeric(12, 2), nullable=False)
    payment_date = db.Column(db.Date, default=datetime.utcnow)
    payment_type = db.Column(db.Enum(PaymentType), nullable=False, default=PaymentType.CASH)
    reference = db.Column(db.String(100))  # cheque number, transaction ID, etc.
    notes = db.Column(db.Text)

    status = db.Column(db.Enum(AdvancePaymentStatus), default=AdvancePaymentStatus.PENDING)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = db.relationship("Customer", backref="advance_payments")

    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    branch = db.relationship("Branch", back_populates="advance_payments")

    def to_dict(self):
        return {
            "id": self.id,
            "advance_number": self.advance_number,
            "customer_id": self.customer_id,
            "customer": self.customer.to_dict() if self.customer else None,
            "amount": float(self.amount or 0),
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "payment_type": self.payment_type.value if self.payment_type else None,
            "reference": self.reference,
            "notes": self.notes,
            "status": self.status.value if self.status else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }