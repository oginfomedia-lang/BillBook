from datetime import datetime

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class Customer(TenantScopedMixin, db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(30))
    billing_address = db.Column(db.Text)
    gstin = db.Column(db.String(20))

    # Running balance: positive = customer owes the tenant money.
    balance = db.Column(db.Numeric(12, 2), default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    invoices = db.relationship("Invoice", back_populates="customer", lazy="dynamic")
    quotations = db.relationship("Quotation", back_populates="customer", lazy="dynamic")

    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    branch = db.relationship("Branch", back_populates="customers")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "billing_address": self.billing_address,
            "gstin": self.gstin,
            "balance": float(self.balance or 0),
        }
