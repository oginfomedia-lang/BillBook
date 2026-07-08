from datetime import datetime
from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class Tax(TenantScopedMixin, db.Model):
    __tablename__ = "taxes"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "name", name="uq_tax_tenant_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    tax_value = db.Column(db.Numeric(5, 2), nullable=False)  # e.g. 18.00 for 18%
    status = db.Column(db.String(20), default="active")  # 'active', 'inactive'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "tax_value": float(self.tax_value),
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
