from datetime import datetime
from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class Variant(TenantScopedMixin, db.Model):
    __tablename__ = "variants"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "name", name="uq_variant_tenant_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="active")  # 'active', 'inactive'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
