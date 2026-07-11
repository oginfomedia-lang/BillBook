from datetime import datetime

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class Supplier(TenantScopedMixin, db.Model):
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    mobile = db.Column(db.String(30))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(30))
    gst_number = db.Column(db.String(50))
    tax_number = db.Column(db.String(50))
    opening_balance = db.Column(db.Numeric(12, 2), default=0)
    country = db.Column(db.String(80))
    state = db.Column(db.String(80))
    city = db.Column(db.String(80))
    postcode = db.Column(db.String(30))
    address = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    branch = db.relationship("Branch", back_populates="suppliers")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "mobile": self.mobile,
            "email": self.email,
            "phone": self.phone,
            "gst_number": self.gst_number,
            "tax_number": self.tax_number,
            "opening_balance": float(self.opening_balance or 0),
            "country": self.country,
            "state": self.state,
            "city": self.city,
            "postcode": self.postcode,
            "address": self.address,
             "is_active": self.is_active,  # ✅ ADDED
            "branch_id": self.branch_id,  # ✅ ADDED
            "created_at": self.created_at.isoformat() if self.created_at else None, 
        }
