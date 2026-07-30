"""
Catalog of purchasable license tiers (Starter / Professional / Enterprise).
Shared across ALL tenants like a lookup table -- deliberately does NOT use
TenantScopedMixin (see app/tenant_scope.py). Seeded via backend/seed_plans.py.
"""
from datetime import datetime

from app.extensions import db


class Plan(db.Model):
    __tablename__ = "plans"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    price = db.Column(db.Numeric(10, 2), nullable=False)       # one-time license fee, INR
    amc_price = db.Column(db.Numeric(10, 2), nullable=False)   # annual maintenance fee, INR

    max_branches = db.Column(db.Integer, nullable=True)  # NULL = unlimited
    max_users = db.Column(db.Integer, nullable=True)     # NULL = unlimited

    is_active = db.Column(db.Boolean, default=True)  # lets you retire a tier without deleting it
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": float(self.price),
            "amc_price": float(self.amc_price),
            "max_branches": self.max_branches,
            "max_users": self.max_users,
            "is_active": self.is_active,
        }