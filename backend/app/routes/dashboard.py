from datetime import date, timedelta, datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import func

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
    # "all" — no filter
    return None


@dashboard_bp.route("/summary", methods=["GET"])
@require_auth
def summary():
    period = request.args.get("period", "all").lower()
    period_filter = _period_filter(period)
    branch_id = request.args.get("branch_id", type=int)          # 👈 New

    # Helper to filter by branch if provided
    def apply_branch_filter(query, model):
        if branch_id:
            return query.filter(model.branch_id == branch_id)
        return query

    # ------------------------------------------------------------------
    # 1. STAT CARDS
    # ------------------------------------------------------------------
    # Total sales (amount collected on paid invoices)
    sales_q = db.session.query(func.coalesce(func.sum(Invoice.amount_paid), 0))
    sales_q = apply_branch_filter(sales_q, Invoice)
    if period_filter is not None:
        sales_q = sales_q.filter(period_filter)
    total_sales = float(sales_q.scalar() or 0)

    # Sales due (balance_due on pending / overdue invoices)
    sales_due_q = (
        db.session.query(
            func.coalesce(func.sum(Invoice.grand_total - Invoice.amount_paid), 0)
        )
        .filter(Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
    )
    sales_due_q = apply_branch_filter(sales_due_q, Invoice)
    if period_filter is not None:
        sales_due_q = sales_due_q.filter(period_filter)
    sales_due = float(sales_due_q.scalar() or 0)

    # Purchase due — not tracked; keep as 0
    purchase_due = 0.0
    expense = 0.0

    # ------------------------------------------------------------------
    # 2. COUNT CARDS
    # ------------------------------------------------------------------
    customer_q = Customer.query
    customer_q = apply_branch_filter(customer_q, Customer)
    customer_count = customer_q.count()

    product_q = Product.query.filter_by(is_active=True)
    product_q = apply_branch_filter(product_q, Product)
    product_count = product_q.count()

    invoice_count_q = Invoice.query
    invoice_count_q = apply_branch_filter(invoice_count_q, Invoice)
    if period_filter is not None:
        invoice_count_q = invoice_count_q.filter(period_filter)
    invoice_count = invoice_count_q.count()

    paid_q = Invoice.query.filter(Invoice.status == InvoiceStatus.PAID)
    paid_q = apply_branch_filter(paid_q, Invoice)
    paid_count = paid_q.count()

    # ------------------------------------------------------------------
    # 3. BAR CHART — sales grouped by date bucket
    # ------------------------------------------------------------------
    today = date.today()
    bar_data = []

    if period == "today":
        bar_rows = (
            db.session.query(
                func.hour(Invoice.issue_date).label("bucket"),
                func.coalesce(func.sum(Invoice.grand_total), 0).label("sales"),
                func.coalesce(func.sum(Invoice.amount_paid), 0).label("collected"),
            )
            .filter(Invoice.issue_date == today)
        )
        bar_rows = apply_branch_filter(bar_rows, Invoice)
        bar_rows = bar_rows.group_by("bucket").order_by("bucket").all()
        bar_data = [
            {"label": f"{row.bucket:02d}:00", "sales": float(row.sales), "purchase": 0, "expense": 0}
            for row in bar_rows
        ]

    elif period == "weekly":
        start = today - timedelta(days=6)
        bar_rows = (
            db.session.query(
                Invoice.issue_date.label("day"),
                func.coalesce(func.sum(Invoice.grand_total), 0).label("sales"),
            )
            .filter(Invoice.issue_date >= start)
        )
        bar_rows = apply_branch_filter(bar_rows, Invoice)
        bar_rows = bar_rows.group_by("day").order_by("day").all()
        bar_data = [
            {"label": row.day.strftime("%a"), "sales": float(row.sales), "purchase": 0, "expense": 0}
            for row in bar_rows
        ]

    elif period == "monthly":
        start = today.replace(day=1)
        bar_rows = (
            db.session.query(
                func.week(Invoice.issue_date).label("wk"),
                func.coalesce(func.sum(Invoice.grand_total), 0).label("sales"),
            )
            .filter(Invoice.issue_date >= start)
        )
        bar_rows = apply_branch_filter(bar_rows, Invoice)
        bar_rows = bar_rows.group_by("wk").order_by("wk").all()
        bar_data = [
            {"label": f"Wk{i + 1}", "sales": float(row.sales), "purchase": 0, "expense": 0}
            for i, row in enumerate(bar_rows)
        ]

    elif period == "yearly":
        start = today.replace(month=1, day=1)
        bar_rows = (
            db.session.query(
                func.date_format(Invoice.issue_date, "%Y-%m").label("month"),
                func.coalesce(func.sum(Invoice.grand_total), 0).label("sales"),
            )
            .filter(Invoice.issue_date >= start)
        )
        bar_rows = apply_branch_filter(bar_rows, Invoice)
        bar_rows = bar_rows.group_by("month").order_by("month").all()
        bar_data = [
            {
                "label": datetime.strptime(row.month, "%Y-%m").strftime("%b"),
                "sales": float(row.sales),
                "purchase": 0,
                "expense": 0,
            }
            for row in bar_rows
        ]

    else:  # all — trailing 6 months grouped by month
        six_months_ago = today.replace(day=1) - timedelta(days=180)
        bar_rows = (
            db.session.query(
                func.date_format(Invoice.issue_date, "%Y-%m").label("month"),
                func.coalesce(func.sum(Invoice.grand_total), 0).label("sales"),
            )
            .filter(Invoice.issue_date >= six_months_ago)
        )
        bar_rows = apply_branch_filter(bar_rows, Invoice)
        bar_rows = bar_rows.group_by("month").order_by("month").all()
        bar_data = [
            {
                "label": datetime.strptime(row.month, "%Y-%m").strftime("%b %Y"),
                "sales": float(row.sales),
                "purchase": 0,
                "expense": 0,
            }
            for row in bar_rows
        ]

    # ------------------------------------------------------------------
    # 4. RECENTLY ADDED PRODUCTS (last 5)
    # ------------------------------------------------------------------
    recent_q = Product.query.filter_by(is_active=True).order_by(Product.created_at.desc()).limit(5)
    recent_q = apply_branch_filter(recent_q, Product)
    recent_products = recent_q.all()
    recent_products_data = [
        {"id": p.id, "name": p.name, "unit_price": float(p.unit_price or 0)}
        for p in recent_products
    ]

    # ------------------------------------------------------------------
    # 5. STOCK ALERT — products at or below threshold (5)
    # ------------------------------------------------------------------
    LOW_STOCK_THRESHOLD = 5
    stock_q = Product.query.filter(
        Product.is_active == True,
        Product.stock_quantity <= LOW_STOCK_THRESHOLD,
    ).order_by(Product.stock_quantity.asc())
    stock_q = apply_branch_filter(stock_q, Product)
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

    # ------------------------------------------------------------------
    # 6. TOP 10 TRENDING ITEMS — by total quantity sold (all time)
    # ------------------------------------------------------------------
    trending_q = (
        db.session.query(
            InvoiceItem.description.label("name"),
            func.coalesce(func.sum(InvoiceItem.quantity), 0).label("total_qty"),
        )
        .join(Invoice, InvoiceItem.invoice_id == Invoice.id)
        .group_by(InvoiceItem.description)
        .order_by(func.sum(InvoiceItem.quantity).desc())
        .limit(10)
    )
    if branch_id:
        trending_q = trending_q.filter(Invoice.branch_id == branch_id)
    trending_rows = trending_q.all()
    trending_data = [
        {"name": row.name, "qty": float(row.total_qty)}
        for row in trending_rows
    ]

    # ------------------------------------------------------------------
    # 7. RECENT SALES INVOICES (last 10, non‑draft)
    # ------------------------------------------------------------------
    recent_inv_q = Invoice.query.filter(Invoice.status != InvoiceStatus.DRAFT).order_by(Invoice.created_at.desc()).limit(10)
    recent_inv_q = apply_branch_filter(recent_inv_q, Invoice)
    recent_invoices = recent_inv_q.all()

    # ------------------------------------------------------------------
    # 8. Legacy monthly_sales (kept for backward compat)
    # ------------------------------------------------------------------
    six_months_ago = today.replace(day=1) - timedelta(days=180)
    monthly_q = (
        db.session.query(
            func.date_format(Invoice.issue_date, "%Y-%m").label("month"),
            func.coalesce(func.sum(Invoice.grand_total), 0).label("total"),
        )
        .filter(Invoice.issue_date >= six_months_ago)
        .group_by("month")
        .order_by("month")
    )
    monthly_q = apply_branch_filter(monthly_q, Invoice)
    monthly_rows = monthly_q.all()
    monthly_sales = [{"month": row.month, "total": float(row.total)} for row in monthly_rows]

    # Legacy pending / paid
    pending_q = Invoice.query.filter(Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
    pending_q = apply_branch_filter(pending_q, Invoice)
    pending_count = pending_q.count()
    pending_amount_q = db.session.query(
        func.coalesce(func.sum(Invoice.grand_total - Invoice.amount_paid), 0)
    ).filter(Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
    pending_amount_q = apply_branch_filter(pending_amount_q, Invoice)
    pending_amount = float(pending_amount_q.scalar() or 0)

    total_revenue_q = db.session.query(func.coalesce(func.sum(Invoice.amount_paid), 0))
    total_revenue_q = apply_branch_filter(total_revenue_q, Invoice)
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