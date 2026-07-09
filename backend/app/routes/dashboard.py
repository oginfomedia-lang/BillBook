from datetime import date, timedelta, datetime
from flask import Blueprint, jsonify, request
from sqlalchemy import func, extract

from app.extensions import db
from app.models import Invoice, InvoiceStatus
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import InvoiceItem
from app.utils.decorators import require_auth

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/v1/dashboard")


def _period_filter(period: str):
    """Return a SQLAlchemy filter expression for Invoice.issue_date matching *period*."""
    today = date.today()
    if period == "today":
        return Invoice.issue_date == today
    if period == "weekly":
        return Invoice.issue_date >= today - timedelta(days=7)
    if period == "monthly":
        return Invoice.issue_date >= today.replace(day=1)
    if period == "yearly":
        return Invoice.issue_date >= today.replace(month=1, day=1)
    return None


def _apply_branch_filter(query, model, branch_id):
    """Apply branch filter BEFORE limit/offset."""
    if branch_id and hasattr(model, 'branch_id'):
        return query.filter(model.branch_id == branch_id)
    return query


@dashboard_bp.route("/summary", methods=["GET"])
@require_auth
def summary():
    period = request.args.get("period", "all").lower()
    period_filter = _period_filter(period)
    branch_id = request.args.get("branch_id", type=int)

    # ──────────────────────────────────────────────────────────────────────────
    # 1. STAT CARDS
    # ──────────────────────────────────────────────────────────────────────────
    
    # Total sales
    sales_q = db.session.query(func.coalesce(func.sum(Invoice.amount_paid), 0))
    sales_q = _apply_branch_filter(sales_q, Invoice, branch_id)
    if period_filter is not None:
        sales_q = sales_q.filter(period_filter)
    total_sales = float(sales_q.scalar() or 0)

    # Sales due
    sales_due_q = (
        db.session.query(
            func.coalesce(func.sum(Invoice.grand_total - Invoice.amount_paid), 0)
        )
        .filter(Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
    )
    sales_due_q = _apply_branch_filter(sales_due_q, Invoice, branch_id)
    if period_filter is not None:
        sales_due_q = sales_due_q.filter(period_filter)
    sales_due = float(sales_due_q.scalar() or 0)

    purchase_due = 0.0
    expense = 0.0

    # ──────────────────────────────────────────────────────────────────────────
    # 2. COUNT CARDS
    # ──────────────────────────────────────────────────────────────────────────
    
    customer_q = Customer.query
    customer_q = _apply_branch_filter(customer_q, Customer, branch_id)
    customer_count = customer_q.count()

    product_q = Product.query.filter_by(is_active=True)
    product_q = _apply_branch_filter(product_q, Product, branch_id)
    product_count = product_q.count()

    invoice_count_q = Invoice.query
    invoice_count_q = _apply_branch_filter(invoice_count_q, Invoice, branch_id)
    if period_filter is not None:
        invoice_count_q = invoice_count_q.filter(period_filter)
    invoice_count = invoice_count_q.count()

    paid_q = Invoice.query.filter(Invoice.status == InvoiceStatus.PAID)
    paid_q = _apply_branch_filter(paid_q, Invoice, branch_id)
    paid_count = paid_q.count()

    # ──────────────────────────────────────────────────────────────────────────
    # 3. BAR CHART - MySQL compatible
    # ──────────────────────────────────────────────────────────────────────────
    
    today = date.today()
    bar_data = []

    try:
        if period == "today":
            # Hourly breakdown for today
            bar_rows = (
                db.session.query(
                    extract('hour', Invoice.issue_date).label('hour'),
                    func.coalesce(func.sum(Invoice.grand_total), 0).label('sales')
                )
                .filter(Invoice.issue_date == today)
            )
            bar_rows = _apply_branch_filter(bar_rows, Invoice, branch_id)
            bar_rows = bar_rows.group_by('hour').order_by('hour').all()
            
            bar_data = [
                {"label": f"{int(row.hour):02d}:00", "sales": float(row.sales or 0), "purchase": 0, "expense": 0}
                for row in bar_rows
            ]

        elif period == "weekly":
            start = today - timedelta(days=6)
            bar_rows = (
                db.session.query(
                    func.date(Invoice.issue_date).label('day'),
                    func.coalesce(func.sum(Invoice.grand_total), 0).label('sales')
                )
                .filter(Invoice.issue_date >= start)
            )
            bar_rows = _apply_branch_filter(bar_rows, Invoice, branch_id)
            bar_rows = bar_rows.group_by('day').order_by('day').all()
            
            day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            bar_data = []
            for row in bar_rows:
                if row.day:
                    day_num = row.day.weekday()
                    bar_data.append({
                        "label": day_names[day_num],
                        "sales": float(row.sales or 0),
                        "purchase": 0,
                        "expense": 0
                    })

        elif period == "monthly":
            start = today.replace(day=1)
            bar_rows = (
                db.session.query(
                    func.week(Invoice.issue_date).label('week'),
                    func.coalesce(func.sum(Invoice.grand_total), 0).label('sales')
                )
                .filter(Invoice.issue_date >= start)
            )
            bar_rows = _apply_branch_filter(bar_rows, Invoice, branch_id)
            bar_rows = bar_rows.group_by('week').order_by('week').all()
            
            bar_data = [
                {"label": f"Wk {i+1}", "sales": float(row.sales or 0), "purchase": 0, "expense": 0}
                for i, row in enumerate(bar_rows)
            ]

        elif period == "yearly":
            start = today.replace(month=1, day=1)
            bar_rows = (
                db.session.query(
                    func.month(Invoice.issue_date).label('month'),
                    func.coalesce(func.sum(Invoice.grand_total), 0).label('sales')
                )
                .filter(Invoice.issue_date >= start)
            )
            bar_rows = _apply_branch_filter(bar_rows, Invoice, branch_id)
            bar_rows = bar_rows.group_by('month').order_by('month').all()
            
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            bar_data = [
                {"label": month_names[int(row.month)-1], "sales": float(row.sales or 0), "purchase": 0, "expense": 0}
                for row in bar_rows if row.month
            ]

        else:  # "all" — trailing 6 months
            six_months_ago = today.replace(day=1) - timedelta(days=180)
            bar_rows = (
                db.session.query(
                    func.date_format(Invoice.issue_date, '%Y-%m').label('month'),
                    func.coalesce(func.sum(Invoice.grand_total), 0).label('sales')
                )
                .filter(Invoice.issue_date >= six_months_ago)
            )
            bar_rows = _apply_branch_filter(bar_rows, Invoice, branch_id)
            bar_rows = bar_rows.group_by('month').order_by('month').all()
            
            bar_data = [
                {
                    "label": row.month,
                    "sales": float(row.sales or 0),
                    "purchase": 0,
                    "expense": 0
                }
                for row in bar_rows if row.month
            ]
            
    except Exception as e:
        print(f"Bar chart error: {e}")
        bar_data = []

    # ──────────────────────────────────────────────────────────────────────────
    # 4. RECENTLY ADDED PRODUCTS
    # ──────────────────────────────────────────────────────────────────────────
    
    recent_q = Product.query.filter_by(is_active=True)
    recent_q = _apply_branch_filter(recent_q, Product, branch_id)
    recent_q = recent_q.order_by(Product.created_at.desc()).limit(5)
    recent_products = recent_q.all()
    
    recent_products_data = [
        {"id": p.id, "name": p.name, "unit_price": float(p.unit_price or 0)}
        for p in recent_products
    ]

    # ──────────────────────────────────────────────────────────────────────────
    # 5. STOCK ALERT
    # ──────────────────────────────────────────────────────────────────────────
    
    LOW_STOCK_THRESHOLD = 5
    stock_q = Product.query.filter(
        Product.is_active == True,
        Product.stock_quantity <= LOW_STOCK_THRESHOLD,
    )
    stock_q = _apply_branch_filter(stock_q, Product, branch_id)
    stock_q = stock_q.order_by(Product.stock_quantity.asc())
    low_stock = stock_q.all()
    
    stock_alert_data = [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku or "",
            "stock_quantity": p.stock_quantity,
            "unit": p.unit,
        }
        for p in low_stock
    ]

    # ──────────────────────────────────────────────────────────────────────────
    # 6. TOP 10 TRENDING ITEMS - FIXED ✅
    # ──────────────────────────────────────────────────────────────────────────
    
    # ✅ Apply branch filter BEFORE limit
    trending_q = (
        db.session.query(
            InvoiceItem.description.label("name"),
            func.coalesce(func.sum(InvoiceItem.quantity), 0).label("total_qty"),
        )
        .join(Invoice, InvoiceItem.invoice_id == Invoice.id)
        .group_by(InvoiceItem.description)
        .order_by(func.sum(InvoiceItem.quantity).desc())
    )
    
    # Apply branch filter before limit
    if branch_id:
        trending_q = trending_q.filter(Invoice.branch_id == branch_id)
    
    trending_q = trending_q.limit(10)
    trending_rows = trending_q.all()
    
    trending_data = [
        {"name": row.name, "qty": float(row.total_qty)}
        for row in trending_rows
    ]

    # ──────────────────────────────────────────────────────────────────────────
    # 7. RECENT SALES INVOICES
    # ──────────────────────────────────────────────────────────────────────────
    
    recent_inv_q = Invoice.query.filter(Invoice.status != InvoiceStatus.DRAFT)
    recent_inv_q = _apply_branch_filter(recent_inv_q, Invoice, branch_id)
    recent_inv_q = recent_inv_q.order_by(Invoice.created_at.desc()).limit(10)
    recent_invoices = recent_inv_q.all()

    # ──────────────────────────────────────────────────────────────────────────
    # 8. Legacy monthly_sales - MySQL compatible
    # ──────────────────────────────────────────────────────────────────────────
    
    six_months_ago = today.replace(day=1) - timedelta(days=180)
    monthly_q = (
        db.session.query(
            func.date_format(Invoice.issue_date, '%Y-%m').label('month'),
            func.coalesce(func.sum(Invoice.grand_total), 0).label('total'),
        )
        .filter(Invoice.issue_date >= six_months_ago)
        .group_by('month')
        .order_by('month')
    )
    monthly_q = _apply_branch_filter(monthly_q, Invoice, branch_id)
    monthly_rows = monthly_q.all()
    monthly_sales = [{"month": row.month, "total": float(row.total)} for row in monthly_rows]

    # Legacy pending / paid
    pending_q = Invoice.query.filter(Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
    pending_q = _apply_branch_filter(pending_q, Invoice, branch_id)
    pending_count = pending_q.count()
    
    pending_amount_q = db.session.query(
        func.coalesce(func.sum(Invoice.grand_total - Invoice.amount_paid), 0)
    ).filter(Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
    pending_amount_q = _apply_branch_filter(pending_amount_q, Invoice, branch_id)
    pending_amount = float(pending_amount_q.scalar() or 0)

    total_revenue_q = db.session.query(func.coalesce(func.sum(Invoice.amount_paid), 0))
    total_revenue_q = _apply_branch_filter(total_revenue_q, Invoice, branch_id)
    total_revenue = float(total_revenue_q.scalar() or 0)

    return jsonify({
        "stats": {
            "purchase_due": purchase_due,
            "sales_due": sales_due,
            "total_sales": total_sales,
            "expense": expense,
        },
        "counts": {
            "customers": customer_count,
            "products": product_count,
            "invoices": invoice_count,
            "paid_invoices": paid_count,
        },
        "bar_chart": bar_data,
        "recent_products": recent_products_data,
        "stock_alert": stock_alert_data,
        "low_stock_threshold": LOW_STOCK_THRESHOLD,
        "top_trending": trending_data,
        "recent_invoices": [inv.to_dict(include_items=False) for inv in recent_invoices],
        "total_revenue": total_revenue,
        "pending_invoices": {"count": pending_count, "amount": pending_amount},
        "paid_invoices": {"count": paid_count},
        "monthly_sales": monthly_sales,
        "recent_transactions": [inv.to_dict(include_items=False) for inv in recent_invoices[:8]],
    })