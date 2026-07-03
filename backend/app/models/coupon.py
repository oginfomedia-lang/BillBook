import enum
from datetime import datetime, date
from decimal import Decimal

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class CouponType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class CouponStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"


class Coupon(TenantScopedMixin, db.Model):
    __tablename__ = "coupons"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "code", name="uq_coupon_tenant_code"),
    )

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), nullable=False, unique=False)  # Unique per tenant
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    occasion = db.Column(db.String(100))  # e.g., "Festival", "New Year", "Referral"

    # Discount configuration
    type = db.Column(db.Enum(CouponType), nullable=False, default=CouponType.PERCENTAGE)
    value = db.Column(db.Numeric(12, 2), nullable=False)  # 10 for 10%, or 100 for ₹100

    # Validity
    expiry_date = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    # Usage limits
    max_uses = db.Column(db.Integer, default=0)  # 0 = unlimited
    used_count = db.Column(db.Integer, default=0)

    # Customer-specific (optional)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = db.relationship("Customer", backref="coupons")

    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    branch = db.relationship("Branch", back_populates="coupons")
    
    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "occasion": self.occasion,
            "type": self.type.value if self.type else None,
            "value": float(self.value or 0),
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "is_active": self.is_active,
            "max_uses": self.max_uses,
            "used_count": self.used_count,
            "customer_id": self.customer_id,
            "customer": self.customer.to_dict() if self.customer else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "status": self.get_status(),
        }

    def get_status(self) -> str:
        """Calculate current status based on expiry and active state."""
        if not self.is_active:
            return "inactive"
        if self.expiry_date and self.expiry_date < date.today():
            return "expired"
        if self.max_uses > 0 and self.used_count >= self.max_uses:
            return "expired"  # or "exhausted"
        return "active"

    def is_valid_for_customer(self, customer_id: int | None) -> bool:
        """Check if the coupon is valid for a specific customer."""
        if not self.is_active:
            return False
        if self.expiry_date and self.expiry_date < date.today():
            return False
        if self.max_uses > 0 and self.used_count >= self.max_uses:
            return False
        if self.customer_id and self.customer_id != customer_id:
            return False
        return True

    def calculate_discount(self, subtotal: float) -> float:
        """Calculate the discount amount based on the subtotal."""
        subtotal_dec = Decimal(str(subtotal))
        if self.type == CouponType.PERCENTAGE:
            discount = (self.value / 100) * subtotal_dec
        else:
            discount = min(self.value, subtotal_dec)
        return float(discount)