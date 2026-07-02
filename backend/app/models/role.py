from datetime import datetime

from app.extensions import db
from app.tenant_scope import TenantScopedMixin


# The full catalog of assignable permissions, grouped by module. The
# frontend renders checkboxes from this same structure (see
# /api/v1/roles/permissions) so the backend is the single source of truth —
# add a permission here and it shows up in the Role editor automatically.
PERMISSION_CATALOG = {
    "users": ["view", "create", "edit", "delete"],
    "roles": ["view", "create", "edit", "delete"],
    "customers": ["view", "create", "edit", "delete", "import"],
    "suppliers": ["view", "create", "edit", "delete", "import"],
    "products": ["view", "create", "edit", "delete", "import"],
    "invoices": ["view", "create", "edit", "delete", "record_payment"],
     "quotations": ["view", "create", "edit", "delete", "convert"],
    "dashboard": ["view"],
    "advance_payments": ["view", "create", "edit", "delete"],
<<<<<<< HEAD
    "coupons": ["view", "create","edit","delete"],
    "reports": ["view"],
    "settings": ["view", "edit"],
    "branches": ["view", "create", "edit", "delete"],
=======
     "purchases": ["view", "create", "edit", "delete"], 
    "reports": ["view"],
    "settings": ["view", "edit"],
     "warehouses": ["view", "create", "edit", "delete"],  
>>>>>>> b84202d2f228adc8d8865588033c1b1415fa0f22
}


def all_permission_keys() -> list[str]:
    """Flattens the catalog into dotted keys, e.g. 'users.create'."""
    return [f"{module}.{action}" for module, actions in PERMISSION_CATALOG.items() for action in actions]


class Role(TenantScopedMixin, db.Model):
    """
    A named, assignable set of permissions within a tenant. Tenant Admins
    can create/edit/delete roles freely; two roles are seeded automatically
    for every new tenant (see seed_default_roles below) so onboarding isn't
    blocked on someone configuring permissions first.
    """

    __tablename__ = "roles"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "name", name="uq_role_tenant_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(255))

    # Stored as a JSON array of dotted permission keys, e.g. ["invoices.create", "invoices.view"]
    permissions = db.Column(db.JSON, nullable=False, default=list)

    # System roles (Tenant Admin's own role) can't be deleted or have
    # permissions revoked below a safety floor — see routes/roles.py
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
    """
    Called once at tenant signup. Creates 'Tenant Admin' (full access,
    system role) and 'Staff' (invoice-focused, matches the old hardcoded
    STAFF behavior) so the new tenant has usable roles immediately.
    Returns the admin role so the caller can assign it to the first user.
    """
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
            "products.view",
            "invoices.view", "invoices.create", "invoices.edit", "invoices.record_payment",
            "purchases.view", "purchases.create", "purchases.edit", 
        ],
        is_system=False,
    )
    db.session.add_all([admin_role, staff_role])
    db.session.flush()
    return admin_role
