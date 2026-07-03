# seed.py
"""
Seeds the database with a demo tenant so you can log in immediately
without going through the signup form.

Run with:  python seed.py
"""
from dotenv import load_dotenv

load_dotenv()

from datetime import date, timedelta

from app import create_app
from app.extensions import db
from app.models import (
    Tenant, User, Role, seed_default_roles,
    Customer, Product, Invoice, InvoiceItem, InvoiceStatus,
    Quotation, QuotationItem, Warehouse,  # Add these imports
)

flask_app = create_app()

with flask_app.app_context():
    # Create tables if they don't exist
    db.create_all()

    if Tenant.query.filter_by(slug="demo-traders").first():
        print("Demo data already exists. Skipping.")
    else:
        tenant = Tenant(company_name="Demo Traders", slug="demo-traders", billing_email="demo@example.com")
        db.session.add(tenant)
        db.session.flush()

        # seed_default_roles creates "Tenant Admin" (full permissions) and
        # "Staff" (invoice-focused), returning the admin role.
        admin_role = seed_default_roles(tenant.id)
        staff_role = Role.query.filter_by(tenant_id=tenant.id, name="Staff").first()

        admin = User(tenant_id=tenant.id, name="Demo Admin", email="admin@demo.com", role_id=admin_role.id)
        admin.set_password("password123")
        db.session.add(admin)

        staff = User(tenant_id=tenant.id, name="Demo Clerk", email="staff@demo.com", role_id=staff_role.id)
        staff.set_password("password123")
        db.session.add(staff)

        customer = Customer(tenant_id=tenant.id, name="Rohan Retail Pvt Ltd", email="rohan@retail.example", phone="9876543210")
        db.session.add(customer)
        db.session.flush()

        product = Product(tenant_id=tenant.id, name="Premium Widget", sku="WID-001", unit_price=250, tax_rate=18, stock_quantity=100)
        db.session.add(product)
        
        # Add more products for variety
        product2 = Product(tenant_id=tenant.id, name="Cotton Shirt", sku="SKU001", unit_price=599, tax_rate=5, stock_quantity=100)
        db.session.add(product2)
        product3 = Product(tenant_id=tenant.id, name="Denim Jeans", sku="SKU002", unit_price=1299, tax_rate=12, stock_quantity=50)
        db.session.add(product3)

        # Create a warehouse
        warehouse = Warehouse(tenant_id=tenant.id, name="Main Warehouse", location="Mumbai, India")
        db.session.add(warehouse)
        db.session.flush()

        # Create a sample quotation
        quotation = Quotation(
            tenant_id=tenant.id,
            quotation_number="QUO-0001",
            customer_id=customer.id,
            warehouse_id=warehouse.id,
            issue_date=date.today(),
            expiry_date=date.today() + timedelta(days=30),
            discount_type="flat",
            discount_value=0,
            notes="Please review and confirm this quotation within 30 days.",
            status="draft",
        )
        quotation.items.append(
            QuotationItem(
                product_id=product.id,
                description=product.name,
                quantity=2,
                unit_price=product.unit_price,
                tax_rate=product.tax_rate,
            )
        )
        quotation.recalculate_totals()
        db.session.add(quotation)

        # Create invoice
        invoice = Invoice(
            tenant_id=tenant.id,
            invoice_number="INV-0001",
            customer_id=customer.id,
            issue_date=date.today(),
            status=InvoiceStatus.PENDING,
        )
        invoice.items.append(
            InvoiceItem(description="Premium Widget", quantity=4, unit_price=250, tax_rate=18)
        )
        invoice.recalculate_totals()
        db.session.add(invoice)

        db.session.commit()

        print("=" * 60)
        print("✅ Seed complete!")
        print("=" * 60)
        print("📋 Created:")
        print(f"  - Tenant: {tenant.company_name}")
        print(f"  - Users: Admin (admin@demo.com), Staff (staff@demo.com)")
        print(f"  - Customer: {customer.name}")
        print(f"  - Products: {product.name}, {product2.name}, {product3.name}")
        print(f"  - Warehouse: {warehouse.name}")
        print(f"  - Quotation: {quotation.quotation_number}")
        print(f"  - Invoice: {invoice.invoice_number}")
        print("\n🔑 Login Credentials:")
        print("  Admin login -> email: admin@demo.com   password: password123")
        print("  Staff login -> email: staff@demo.com   password: password123")
        print("=" * 60)