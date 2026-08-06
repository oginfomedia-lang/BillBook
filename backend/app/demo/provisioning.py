"""
Self-service demo tenant provisioning.

Mirrors app/routes/auth.py::signup() (same Tenant/Role/User creation shape),
but additionally creates one Branch + Warehouse (plain signup() doesn't --
only the dev-only backend/seed.py script does that), stamps
is_demo/demo_expires_at, and seeds a small set of sample business data via
seed_demo_data() so a fresh demo tenant isn't an empty shell.
"""
import secrets
from datetime import datetime, timedelta
from decimal import Decimal

from app.extensions import db
from app.models import (
    Tenant, Branch, Warehouse, User, seed_default_roles,
    Customer, Supplier, Item, Category, Brand, Unit, Tax,
    Invoice, InvoiceItem, InvoiceStatus,
    Quotation, QuotationItem, QuotationStatus,
    Purchase, PurchaseItem, PurchaseStatus,
)

DEMO_DURATION_HOURS = 48


def _slugify(value: str) -> str:
    base = "".join(c.lower() if c.isalnum() else "-" for c in value).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return base or "demo"


def create_demo_tenant(email: str, name: str) -> tuple[Tenant, Branch, Warehouse, User]:
    """
    Creates a throwaway, self-expiring tenant: Tenant (is_demo=True,
    demo_expires_at = now + 48h) + one Branch + one Warehouse + the two
    default Roles (Tenant Admin / Staff, same as a real signup) + one admin
    User. Does NOT seed sample business data or commit -- call
    seed_demo_data() next, then the caller commits once (see
    app/demo/routes.py::signup()), same single-transaction shape as
    auth.py::signup().

    Caller is responsible for checking email uniqueness first (mirrors
    signup()'s own check) -- kept out of this function so it stays a pure
    "build the objects" step.
    """
    slug_base = _slugify(name or "demo")
    slug = f"{slug_base}-demo"
    suffix = 1
    while Tenant.query.filter_by(slug=slug).first():
        suffix += 1
        slug = f"{slug_base}-demo-{suffix}"

    tenant = Tenant(
        company_name=name or "Demo Company",
        slug=slug,
        billing_email=email,
        is_demo=True,
        demo_expires_at=datetime.utcnow() + timedelta(hours=DEMO_DURATION_HOURS),
    )
    db.session.add(tenant)
    db.session.flush()  # need tenant.id for everything below

    admin_role = seed_default_roles(tenant.id)

    branch = Branch(tenant_id=tenant.id, name="Main Branch", code="MAIN", is_active=True)
    db.session.add(branch)
    db.session.flush()  # need branch.id for the warehouse + admin user

    warehouse = Warehouse(tenant_id=tenant.id, branch_id=branch.id, name="Main Warehouse")
    db.session.add(warehouse)
    db.session.flush()

    admin = User(
        tenant_id=tenant.id,
        name=name or "Demo Admin",
        email=email,
        role_id=admin_role.id,
        branch_id=branch.id,
        is_super_admin=True,
    )
    # Demo users only ever log in via the auto-login token exchange (see
    # app/routes/auth.py::demo_login()) -- this password is never handed
    # out anywhere and only exists because password_hash is NOT NULL.
    admin.set_password(secrets.token_urlsafe(32))
    db.session.add(admin)
    db.session.flush()

    return tenant, branch, warehouse, admin


def seed_demo_data(tenant: Tenant, branch: Branch, warehouse: Warehouse, admin: User) -> None:
    """
    Populates a handful of realistic sample rows so a fresh demo isn't an
    empty shell: one unit/tax/category/brand, 3 items, a customer + a
    supplier, and one sample invoice, quotation, and purchase. Field
    choices mirror what the real create routes
    (app/routes/items.py::create_item(), invoices.py, quotations.py,
    purchases.py) set, minus marshmallow validation -- this is trusted,
    server-generated data, not user input, same as backend/seed.py's
    approach for local dev seeding.

    Invoice/quotation/purchase numbers are hardcoded to "-0001" rather than
    going through _generate_invoice_number() etc. -- safe here because this
    always runs against a brand-new, still-empty tenant, so "0001" is
    guaranteed free without needing those functions' full existing-rows scan.

    Commits at the end -- same single-transaction shape as
    auth.py::signup() and backend/seed.py.
    """
    tenant_id = tenant.id

    unit = Unit(tenant_id=tenant_id, name="Piece", short_name="pcs")
    tax = Tax(tenant_id=tenant_id, name="GST 18%", tax_value=Decimal("18.00"))
    category = Category(tenant_id=tenant_id, branch_id=branch.id, name="General")
    brand = Brand(tenant_id=tenant_id, branch_id=branch.id, name="Generic")
    db.session.add_all([unit, tax, category, brand])
    db.session.flush()

    items = []
    for i, (item_name, price, stock) in enumerate(
        [
            ("Sample Widget A", 250, 40),
            ("Sample Widget B", 500, 25),
            ("Sample Service Package", 1500, 0),
        ],
        start=1,
    ):
        item = Item(
            tenant_id=tenant_id,
            branch_id=branch.id,
            warehouse_id=warehouse.id,
            item_code=f"DEMO-{i:03d}",
            item_name=item_name,
            unit_id=unit.id,
            category_id=category.id,
            brand_id=brand.id,
            tax_id=tax.id,
            sales_price=Decimal(str(price)),
            opening_stock=stock,
            type="item" if stock else "service",
        )
        db.session.add(item)
        items.append(item)
    db.session.flush()  # need item ids for the line items below

    customer = Customer(
        tenant_id=tenant_id, branch_id=branch.id,
        name="Sample Customer", email="customer@example.com", phone="9000000001",
    )
    supplier = Supplier(
        tenant_id=tenant_id, branch_id=branch.id,
        name="Sample Supplier", email="supplier@example.com", mobile="9000000002",
    )
    db.session.add_all([customer, supplier])
    db.session.flush()

    invoice = Invoice(
        tenant_id=tenant_id, branch_id=branch.id, customer_id=customer.id,
        invoice_number="INV-0001", status=InvoiceStatus.PENDING, created_by=admin.id,
    )
    invoice.items = [
        InvoiceItem(
            branch_id=branch.id, item_id=items[0].id, description=items[0].item_name,
            quantity=2, unit_price=items[0].sales_price, tax_rate=tax.tax_value,
        )
    ]
    db.session.add(invoice)
    invoice.recalculate_totals()

    quotation = Quotation(
        tenant_id=tenant_id, branch_id=branch.id, warehouse_id=warehouse.id,
        customer_id=customer.id, quotation_number="QUO-0001", status=QuotationStatus.SENT,
    )
    quotation.items = [
        QuotationItem(
            item_id=items[1].id, description=items[1].item_name,
            quantity=1, unit_price=items[1].sales_price, tax_rate=tax.tax_value,
        )
    ]
    db.session.add(quotation)
    quotation.recalculate_totals()

    purchase = Purchase(
        tenant_id=tenant_id, branch_id=branch.id, warehouse_id=warehouse.id,
        supplier_id=supplier.id, purchase_code="PU-0001",
        status=PurchaseStatus.RECEIVED, created_by=admin.id,
    )
    purchase.items = [
        PurchaseItem(
            item_id=items[0].id, description=items[0].item_name,
            quantity=10, purchase_price=Decimal("150.00"),
        )
    ]
    db.session.add(purchase)
    purchase.recalculate_totals()
    purchase.update_payment_status()

    db.session.commit()
