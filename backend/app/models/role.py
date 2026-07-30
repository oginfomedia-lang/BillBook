from datetime import datetime

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


# The full catalog of assignable permissions, grouped by module.
PERMISSION_CATALOG = {
    "users": ["view", "create", "edit", "delete"],
    "roles": ["view", "create", "edit", "delete"],
    "customers": ["view", "create", "edit", "delete", "import"],
    "suppliers": ["view", "create", "edit", "delete", "import"],
    "items": ["view", "create", "edit", "delete", "import"],
    "sales": ["view", "create", "edit", "delete", "return_sales"],   # Sales / POS module
    "invoices": ["view", "create", "edit", "delete", "record_payment"],
    "quotations": ["view", "create", "edit", "delete", "convert"],
    "warehouses": ["view", "create", "edit", "delete"],
    "purchases": ["view", "create", "edit", "delete"],
    "accounts": ["view", "create", "edit", "delete"],
    "dashboard": ["view"],
    "advance_payments": ["view", "create", "edit", "delete"],
    "stock": ["view", "create", "edit", "delete"],
    "expenses": ["view", "create", "edit", "delete"],
    "coupons": ["view", "create", "edit", "delete"],
    "branches": ["view", "create", "edit", "delete"],
    "reports": ["view"],
    "settings": ["view", "edit"],
 # "manage" is intentionally never checked via @require_permission -- the
    # one cross-tenant billing action (super-admin manual plan assignment)
    # gates on @require_platform_admin instead (see app/utils/decorators.py),
    # since it's a platform-operator action, not a per-tenant permission.
    # It's still listed here so it shows up in the role editor / permission
    # catalog UI for documentation.
    "billing": ["view", "manage"],
}


def all_permission_keys() -> list[str]:
    """Flattens the catalog into dotted keys, e.g. 'users.create'."""
    return [f"{module}.{action}" for module, actions in PERMISSION_CATALOG.items() for action in actions]


class Role(TenantScopedMixin, db.Model):
    __tablename__ = "roles"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "name", name="uq_role_tenant_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(255))

    permissions = db.Column(db.JSON, nullable=False, default=list)
    is_system = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    users = db.relationship("User", back_populates="role_ref", lazy="dynamic")

    def has_permission(self, key: str) -> bool:
        return key in (self.permissions or [])

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "permissions": self.permissions or [],
            "is_system": self.is_system,
            "user_count": self.users.count(),
        }


def seed_default_roles(tenant_id: int) -> "Role":
    admin_role = Role(
        tenant_id=tenant_id,
        name="Tenant Admin",
        description="Full access to all modules",
        permissions=all_permission_keys(),
        is_system=True,
    )
    staff_role = Role(
        tenant_id=tenant_id,
        name="Staff",
        description="Can create invoices and manage customers, no settings access",
        permissions=[
            "dashboard.view",
            "customers.view", "customers.create", "customers.edit",
            "items.view",
            "sales.view", "sales.create", "sales.edit", "sales.return_sales",  # Sales module
            "invoices.view", "invoices.create", "invoices.edit", "invoices.record_payment",
            "quotations.view", "quotations.create", "quotations.edit", "quotations.convert",
            "advance_payments.view", "advance_payments.create",
            "purchases.view", "purchases.create", "purchases.edit",
            "accounts.view",
            "stock.view", "stock.create",
            "expenses.view", "expenses.create",
            "coupons.view", "coupons.create", "coupons.edit", "coupons.delete",
            "branches.view", "branches.create", "branches.edit", "branches.delete",
        ],
        is_system=False,
    )
    db.session.add_all([admin_role, staff_role])
    db.session.flush()
    return admin_role