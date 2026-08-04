from datetime import datetime

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class Warehouse(TenantScopedMixin, db.Model):
    __tablename__ = "warehouses"

    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    name = db.Column(db.String(150), nullable=False)
    location = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    quotations = db.relationship("Quotation", back_populates="warehouse", lazy="dynamic")
    branch = db.relationship("Branch")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "branch_id": self.branch_id,
            "branch_name": self.branch.name if self.branch else None,
        }
