"""
One row per tenant -- the tenant's CURRENT entitlement. Upgrades UPDATE this
row in place; there is no history here (see payment_transaction.py for the
append-only audit trail of every purchase/upgrade attempt).
"""
from datetime import datetime

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class LicenseStatus:
    ACTIVE = "active"
    SUSPENDED = "suspended"  # manual override, e.g. by a platform admin


class TenantLicense(TenantScopedMixin, db.Model):
    __tablename__ = "tenant_licenses"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", name="uq_tenant_license_tenant"),
    )

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("plans.id"), nullable=False)

    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)
    amc_valid_until = db.Column(db.Date, nullable=True)  # NULL = AMC never paid / lapsed indefinitely
    status = db.Column(db.String(20), default=LicenseStatus.ACTIVE)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plan = db.relationship("Plan")

    def to_dict(self):
        amc_expired = (
            self.amc_valid_until is not None
            and self.amc_valid_until < datetime.utcnow().date()
        )
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "plan": self.plan.to_dict() if self.plan else None,
            "purchased_at": self.purchased_at.isoformat() if self.purchased_at else None,
            "amc_valid_until": self.amc_valid_until.isoformat() if self.amc_valid_until else None,
            "amc_expired": amc_expired,
            "status": self.status,
        }