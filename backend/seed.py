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
    Quotation, QuotationItem, Warehouse, Branch
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

        # ✅ Create Branches
        branch1 = Branch(
            tenant_id=tenant.id,
            name="Mumbai Main",
            code="MUM-001",
            address="Mumbai, Maharashtra",
            phone="+91 98765 43210",
            email="mumbai@demo.com",
            is_active=True
        )
        db.session.add(branch1)

        branch2 = Branch(
            tenant_id=tenant.id,
            name="Delhi Branch",
            code="DEL-001",
            address="Delhi, NCR",
            phone="+91 98765 43211",
            email="delhi@demo.com",
            is_active=True
        )
        db.session.add(branch2)
        db.session.flush()

        # seed_default_roles creates "Tenant Admin" and "Staff"
        admin_role = seed_default_roles(tenant.id)
        staff_role = Role.query.filter_by(tenant_id=tenant.id, name="Staff").first()

        # ✅ Super Admin (no branch)
        admin = User(
            tenant_id=tenant.id,
            name="Demo Admin",
            email="admin@demo.com",
            role_id=admin_role.id,
            branch_id=None,  # ✅ Super Admin has no branch
            is_super_admin=True
        )
        admin.set_password("password123")
        db.session.add(admin)

        # ✅ Branch Manager - Mumbai
        mumbai_manager = User(
            tenant_id=tenant.id,
            name="Mumbai Manager",
            email="mumbai@demo.com",
            role_id=admin_role.id,
            branch_id=branch1.id,  # ✅ Assigned to Mumbai
            is_super_admin=False
        )
        mumbai_manager.set_password("password123")
        db.session.add(mumbai_manager)

        # ✅ Branch Manager - Delhi
        delhi_manager = User(
            tenant_id=tenant.id,
            name="Delhi Manager",
            email="delhi@demo.com",
            role_id=admin_role.id,
            branch_id=branch2.id,  # ✅ Assigned to Delhi
            is_super_admin=False
        )
        delhi_manager.set_password("password123")
        db.session.add(delhi_manager)

        # ✅ Staff - Mumbai
        mumbai_staff = User(
            tenant_id=tenant.id,
            name="Mumbai Staff",
            email="mumbai-staff@demo.com",
            role_id=staff_role.id,
            branch_id=branch1.id,
            is_super_admin=False
        )
        mumbai_staff.set_password("password123")
        db.session.add(mumbai_staff)

        # ✅ Staff - Delhi
        delhi_staff = User(
            tenant_id=tenant.id,
            name="Delhi Staff",
            email="delhi-staff@demo.com",
            role_id=staff_role.id,
            branch_id=branch2.id,
            is_super_admin=False
        )
        delhi_staff.set_password("password123")
        db.session.add(delhi_staff)

        # Create sample customer
        customer = Customer(
            tenant_id=tenant.id,
            name="Rohan Retail Pvt Ltd",
            email="rohan@retail.example",
            phone="9876543210"
        )
        db.session.add(customer)
        db.session.flush()

        # Create sample products
        product = Product(
            tenant_id=tenant.id,
            name="Premium Widget",
            sku="WID-001",
            unit_price=250,
            tax_rate=18,
            stock_quantity=100,
            branch_id=branch1.id  # ✅ Product belongs to Mumbai
        )
        db.session.add(product)
        
        product2 = Product(
            tenant_id=tenant.id,
            name="Cotton Shirt",
            sku="SKU001",
            unit_price=599,
            tax_rate=5,
            stock_quantity=100,
            branch_id=branch1.id
        )
        db.session.add(product2)
        
        product3 = Product(
            tenant_id=tenant.id,
            name="Denim Jeans",
            sku="SKU002",
            unit_price=1299,
            tax_rate=12,
            stock_quantity=50,
            branch_id=branch2.id  # ✅ Product belongs to Delhi
        )
        db.session.add(product3)

        # Create warehouse
        warehouse = Warehouse(
            tenant_id=tenant.id,
            name="Main Warehouse",
            location="Mumbai, India"
        )
        db.session.add(warehouse)
        db.session.flush()

        # Create quotation
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
            branch_id=branch1.id  # ✅ Invoice belongs to Mumbai
        )
        invoice.items.append(
            InvoiceItem(
                description="Premium Widget",
                quantity=4,
                unit_price=250,
                tax_rate=18,
                branch_id=branch1.id
            )
        )
        invoice.recalculate_totals()
        db.session.add(invoice)

        db.session.commit()

        print("=" * 60)
        print("✅ Seed complete!")
        print("=" * 60)
        print("📋 Created:")
        print(f"  - Tenant: {tenant.company_name}")
        print(f"  - Branches: {branch1.name}, {branch2.name}")
        print("\n👤 Users:")
        print(f"  - Super Admin: admin@demo.com / password123 (All Branches)")
        print(f"  - Mumbai Manager: mumbai@demo.com / password123 (Mumbai Only)")
        print(f"  - Delhi Manager: delhi@demo.com / password123 (Delhi Only)")
        print(f"  - Mumbai Staff: mumbai-staff@demo.com / password123 (Mumbai Only)")
        print(f"  - Delhi Staff: delhi-staff@demo.com / password123 (Delhi Only)")
        print("\n📦 Products:")
        print(f"  - {product.name} (Mumbai)")
        print(f"  - {product2.name} (Mumbai)")
        print(f"  - {product3.name} (Delhi)")
        print("=" * 60)