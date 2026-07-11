from datetime import datetime

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class Product(TenantScopedMixin, db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    sku = db.Column(db.String(60))
    description = db.Column(db.Text)

    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    tax_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    stock_quantity = db.Column(db.Integer, default=0)
    unit = db.Column(db.String(20), default="pcs")

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ✅ Make sure branch_id exists
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    branch = db.relationship("Branch", back_populates="products", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "description": self.description,
            "unit_price": float(self.unit_price or 0),
            "tax_rate": float(self.tax_rate or 0),
            "stock_quantity": self.stock_quantity,
            "unit": self.unit,
            "is_active": self.is_active,
            "branch_id": self.branch_id,  # ✅ ADD THIS
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }