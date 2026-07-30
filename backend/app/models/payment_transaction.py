"""
Append-only audit trail of every plan purchase/upgrade attempt. Order
creation writes a 'created' row; successful signature verification flips it
to 'paid' and activates the plan. Kept separate from TenantLicense (current
state only) so retried verify-payment calls / failed attempts don't corrupt
the current-state row, and so Razorpay retries are idempotent.
"""
from datetime import datetime

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class PaymentStatus:
    CREATED = "created"
    PAID = "paid"
    FAILED = "failed"


class PaymentTransaction(TenantScopedMixin, db.Model):
    __tablename__ = "payment_transactions"

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("plans.id"), nullable=False)

    razorpay_order_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    razorpay_payment_id = db.Column(db.String(64), nullable=True)
    razorpay_signature = db.Column(db.String(255), nullable=True)

    amount = db.Column(db.Numeric(10, 2), nullable=False)  # INR, matches plan.price at time of purchase
    currency = db.Column(db.String(3), default="INR")
    status = db.Column(db.String(20), default=PaymentStatus.CREATED)

    created_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified_at = db.Column(db.DateTime, nullable=True)

    plan = db.relationship("Plan")

    def to_dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "plan": self.plan.to_dict() if self.plan else None,
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "amount": float(self.amount),
            "currency": self.currency,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
        }