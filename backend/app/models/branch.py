# app/models/branch.py

from datetime import datetime
from app.extensions import db
from app.tenant_scope import TenantScopedMixin

class Branch(TenantScopedMixin, db.Model):
    __tablename__ = "branches"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "code", name="uq_branch_tenant_code"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(50), nullable=False)
    address = db.Column(db.Text)
    phone = db.Column(db.String(30))
    email = db.Column(db.String(120))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ✅ CORRECT Relationships
    customers = db.relationship("Customer", back_populates="branch", lazy="dynamic")
    products = db.relationship("Product", back_populates="branch", lazy="dynamic")
    invoices = db.relationship("Invoice", back_populates="branch", lazy="dynamic")
    invoice_items = db.relationship("InvoiceItem", back_populates="branch", lazy="dynamic")  # ← ADD THIS
    suppliers = db.relationship("Supplier", back_populates="branch", lazy="dynamic")
    advance_payments = db.relationship("AdvancePayment", back_populates="branch", lazy="dynamic")
    coupons = db.relationship("Coupon", back_populates="branch", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "address": self.address,
            "phone": self.phone,
            "email": self.email,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }