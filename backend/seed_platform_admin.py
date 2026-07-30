"""
Creates the platform-operator account used to access the cross-tenant
Super Admin billing screen (manual plan assignment). This is NOT a regular
tenant signup -- the resulting User row has tenant_id=None, which is what
makes require_platform_admin (app/utils/decorators.py) accept it. Every
other login flow in this app creates tenant-scoped admins (see
app/routes/auth.py signup()), so this script is the only way to create
this kind of account.

Run with:  python seed_platform_admin.py

Set PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD via env vars before
running anywhere but local dev -- the defaults below are for convenience
only and are NOT secure.
"""
import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
from app.models import User

PLATFORM_ADMIN_EMAIL = os.environ.get("PLATFORM_ADMIN_EMAIL", "platform-admin@billbook.local")
PLATFORM_ADMIN_PASSWORD = os.environ.get("PLATFORM_ADMIN_PASSWORD", "change-me-now-123")
PLATFORM_ADMIN_NAME = "BillBook Platform Admin"

flask_app = create_app()

with flask_app.app_context():
    db.create_all()

    existing = User.query.filter_by(email=PLATFORM_ADMIN_EMAIL, tenant_id=None).first()
    if existing:
        print(f"Platform admin '{PLATFORM_ADMIN_EMAIL}' already exists. Skipping.")
    else:
        admin = User(
            tenant_id=None,
            role_id=None,
            branch_id=None,
            name=PLATFORM_ADMIN_NAME,
            email=PLATFORM_ADMIN_EMAIL,
            is_super_admin=True,
            is_active=True,
        )
        admin.set_password(PLATFORM_ADMIN_PASSWORD)
        db.session.add(admin)
        db.session.commit()
        print("=" * 60)
        print("Platform admin created.")
        print(f"  email:    {PLATFORM_ADMIN_EMAIL}")
        print(f"  password: {PLATFORM_ADMIN_PASSWORD}")
        print("Log in at /login like any user -- the JWT's tenant_id claim")
        print("will be null, unlocking the cross-tenant billing admin screen")
        print("and hiding the normal tenant-scoped menu (see DashboardLayout.tsx).")
        print("=" * 60)