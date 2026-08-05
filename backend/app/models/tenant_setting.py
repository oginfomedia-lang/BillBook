from datetime import datetime
from app.extensions import db
from app.tenant_scope import TenantScopedMixin

class TenantSetting(TenantScopedMixin, db.Model):
    __tablename__ = "tenant_settings"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "branch_id", "key", name="uq_tenant_setting_branch_key"),
    )

    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=True, index=True)
    key = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "branch_id": self.branch_id,
        }
