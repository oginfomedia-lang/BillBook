from datetime import datetime

from app.extensions import db
from app.tenant_scope import exempt_from_tenant_scoping


@exempt_from_tenant_scoping
class Tenant(db.Model):
    """
    One row per business client (the SaaS customer). Every other table
    hangs off this via tenant_id. This model itself is exempt from
    auto-scoping since it IS the scope, not scoped by it.
    """

    __tablename__ = "tenants"

    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(150), nullable=False)
    slug = db.Column(db.String(80), unique=True, nullable=False, index=True)

    # Business profile used on generated invoices
    billing_email = db.Column(db.String(120))
    phone = db.Column(db.String(30))
    address = db.Column(db.Text)
    gstin = db.Column(db.String(20))  # GST identification number, optional
    default_currency = db.Column(db.String(3), default="INR")

    plan = db.Column(db.String(30), default="trial")  # trial / starter / pro
    is_active = db.Column(db.Boolean, default=True)

    # Self-service "Live Demo" tenants: is_demo=True + demo_expires_at is the
    # ONLY signal that matters (see app/demo/guard.py) -- expiry is checked
    # live against datetime.utcnow() on every request via JWT claims, never
    # via a cached/precomputed flag. app/demo/sweep.py purges these once
    # demo_expires_at is in the past (run via `flask sweep-demo`, cron-driven).
    is_demo = db.Column(db.Boolean, default=False, nullable=False)
    demo_expires_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    users = db.relationship("User", back_populates="tenant", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "company_name": self.company_name,
            "slug": self.slug,
            "billing_email": self.billing_email,
            "phone": self.phone,
            "address": self.address,
            "gstin": self.gstin,
            "default_currency": self.default_currency,
            "plan": self.plan,
            "is_active": self.is_active,
            "is_demo": self.is_demo,
            "demo_expires_at": self.demo_expires_at.isoformat() if self.demo_expires_at else None,
        }
