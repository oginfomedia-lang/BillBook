from datetime import datetime
from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class Category(TenantScopedMixin, db.Model):
    __tablename__ = "categories"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "branch_id", "name", name="uq_category_tenant_branch_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="active")  # 'active', 'inactive'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "branch_id": self.branch_id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
