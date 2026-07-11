from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


class User(TenantScopedMixin, db.Model):
    """
    A login identity, always scoped to a tenant — EXCEPT Super Admins, who
    have tenant_id = NULL, role_id = NULL, and is_super_admin = True.

    Within a tenant, permissions come from the assigned Role (role_id),
    not a hardcoded enum — see app/models/role.py. This lets Tenant Admins
    define their own roles (e.g. "Inventory Manager") instead of being
    stuck with a fixed Admin/Staff split.
    """

    __tablename__ = "users"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),
    )

    id = db.Column(db.Integer, primary_key=True)

    tenant_id = db.Column(
        db.Integer, db.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True
    )
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)

    # ✅ ADD THIS - Branch assignment for regular users
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)

    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar = db.Column(db.Text, nullable=True)

    # True only for SaaS-owner accounts; bypasses tenant scoping and the
    # Role permission system entirely (checked first in has_permission()).
    is_super_admin = db.Column(db.Boolean, default=False)

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ✅ ADD THIS - Relationship to Branch
    branch = db.relationship("Branch", backref="users", lazy=True)

    tenant = db.relationship("Tenant", back_populates="users")
    role_ref = db.relationship("Role", back_populates="users")

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    def has_permission(self, key: str) -> bool:
        if self.is_super_admin:
            return True
        return self.role_ref.has_permission(key) if self.role_ref else False

    def get_accessible_branches(self):
        """Get all branches user can access"""
        from app.models import Branch
        
        if self.is_super_admin:
            return Branch.query.filter_by(tenant_id=self.tenant_id, is_active=True).all()
        
        if self.branch_id:
            branch = Branch.query.get(self.branch_id)
            if branch and branch.is_active:
                return [branch]
        
        return []

    def to_dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "name": self.name,
            "email": self.email,
            "role_id": self.role_id,
            "role_name": self.role_ref.name if self.role_ref else ("Super Admin" if self.is_super_admin else None),
            "branch_id": self.branch_id,  # ✅ ADD THIS
            "is_super_admin": self.is_super_admin,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "avatar": self.avatar,
        }