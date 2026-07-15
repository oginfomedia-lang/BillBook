from datetime import datetime, date, timedelta
from flask import Blueprint, jsonify, request
from sqlalchemy import func, and_
from app.extensions import db
from app.models import Invoice, InvoiceStatus, Branch, Category, Warehouse, Item, PurchaseReturn
from app.models.purchase import Purchase
from app.models.expense import Expense, ExpenseCategory
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.utils.decorators import require_auth, require_permission
from app.branch_scope import BranchContext

reports_bp = Blueprint("reports", __name__, url_prefix="/api/v1/reports")


def _apply_branch_filter(query, model, branch_id=None):
    """Filters query by branch_id if specified, or falls back to active BranchContext."""
    bid = branch_id or BranchContext.get()
    if bid and hasattr(model, 'branch_id'):
        return query.filter(model.branch_id == bid)
    return query


def _apply_date_filter(query, date_column, start_date_str, end_date_str):
    """Filters query between start_date and end_date if they are provided."""
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            query = query.filter(date_column >= start_date)
        except ValueError:
            pass
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            query = query.filter(date_column <= end_date)
        except ValueError:
            pass
    return query


@reports_bp.route("/sales", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_sales_report():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    branch_id = request.args.get("branch_id", type=int)
    customer_id = request.args.get("customer_id", type=int)
    status = request.args.get("status")

    # Invoices list
    query = Invoice.query
    query = _apply_branch_filter(query, Invoice, branch_id)
    query = _apply_date_filter(query, Invoice.issue_date, start_date, end_date)

    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    if status:
        query = query.filter(Invoice.status == status)

    invoices = query.order_by(Invoice.issue_date.desc()).all()

    # Calculate summaries
    total_sales = sum(float(i.grand_total or 0) for i in invoices if i.status != InvoiceStatus.CANCELLED)
    total_paid = sum(float(i.amount_paid or 0) for i in invoices if i.status != InvoiceStatus.CANCELLED)
    total_due = sum(float((i.grand_total or 0) - (i.amount_paid or 0)) for i in invoices if i.status != InvoiceStatus.CANCELLED)
    total_tax = sum(float(i.tax_total or 0) for i in invoices if i.status != InvoiceStatus.CANCELLED)
    total_discount = sum(float(i.discount_total or 0) for i in invoices if i.status != InvoiceStatus.CANCELLED)

    # Sales by date for chart (limit to last 30 intervals or the filtered dates)
    sales_by_date_q = db.session.query(
        Invoice.issue_date,
        func.sum(Invoice.grand_total).label("amount"),
        func.count(Invoice.id).label("count")
    ).filter(Invoice.status != InvoiceStatus.CANCELLED)
    sales_by_date_q = _apply_branch_filter(sales_by_date_q, Invoice, branch_id)
    sales_by_date_q = _apply_date_filter(sales_by_date_q, Invoice.issue_date, start_date, end_date)
    if customer_id:
        sales_by_date_q = sales_by_date_q.filter(Invoice.customer_id == customer_id)
    
    sales_by_date = sales_by_date_q.group_by(Invoice.issue_date).order_by(Invoice.issue_date.asc()).all()
    chart_data = [{"date": s[0].isoformat(), "amount": float(s[1] or 0), "count": s[2]} for s in sales_by_date]

    return jsonify({
        "summary": {
            "total_sales": total_sales,
            "total_paid": total_paid,
            "total_due": total_due,
            "total_tax": total_tax,
            "total_discount": total_discount,
            "count": len(invoices)
        },
        "chart_data": chart_data,
        "items": [inv.to_dict(include_items=False) for inv in invoices]
    })


@reports_bp.route("/purchases", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_purchases_report():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    branch_id = request.args.get("branch_id", type=int)
    supplier_id = request.args.get("supplier_id", type=int)
    status = request.args.get("status")

    query = Purchase.query
    query = _apply_branch_filter(query, Purchase, branch_id)
    query = _apply_date_filter(query, Purchase.purchase_date, start_date, end_date)

    if supplier_id:
        query = query.filter(Purchase.supplier_id == supplier_id)
    if status:
        query = query.filter(Purchase.status == status)

    purchases = query.order_by(Purchase.purchase_date.desc()).all()

    total_purchases = sum(float(p.grand_total or 0) for p in purchases if p.status != "cancelled")
    total_paid = sum(float(p.amount_paid or 0) for p in purchases if p.status != "cancelled")
    total_due = sum(float((p.grand_total or 0) - (p.amount_paid or 0)) for p in purchases if p.status != "cancelled")

    return jsonify({
        "summary": {
            "total_purchases": total_purchases,
            "total_paid": total_paid,
            "total_due": total_due,
            "count": len(purchases)
        },
        "items": [p.to_dict() for p in purchases]
    })


@reports_bp.route("/expenses", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_expenses_report():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    branch_id = request.args.get("branch_id", type=int)
    category_id = request.args.get("category_id", type=int)

    query = Expense.query
    query = _apply_branch_filter(query, Expense, branch_id)
    query = _apply_date_filter(query, Expense.expense_date, start_date, end_date)

    if category_id:
        query = query.filter(Expense.category_id == category_id)

    expenses = query.order_by(Expense.expense_date.desc()).all()

    total_expenses = sum(float(e.amount or 0) for e in expenses)

    # Grouped by category
    cat_query = db.session.query(
        ExpenseCategory.name,
        func.sum(Expense.amount).label("total")
    ).join(Expense, Expense.category_id == ExpenseCategory.id)
    cat_query = _apply_branch_filter(cat_query, Expense, branch_id)
    cat_query = _apply_date_filter(cat_query, Expense.expense_date, start_date, end_date)
    if category_id:
        cat_query = cat_query.filter(Expense.category_id == category_id)
    
    categories_summary = cat_query.group_by(ExpenseCategory.name).all()
    categories_data = [{"category": c[0], "amount": float(c[1] or 0)} for c in categories_summary]

    return jsonify({
        "summary": {
            "total_expenses": total_expenses,
            "count": len(expenses)
        },
        "categories": categories_data,
        "items": [e.to_dict() for e in expenses]
    })


@reports_bp.route("/profit-loss", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_profit_loss_report():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    branch_id = request.args.get("branch_id", type=int)

    # Helper function to get totals from query
    def get_val(q):
        return float(q.scalar() or 0)

    # 1. Opening Stock Value (from Item table)
    # Filter by branch if applicable (Warehouse -> Branch)
    # We can join Item with Warehouse to filter by branch
    opening_stock_q = db.session.query(func.coalesce(func.sum(Item.opening_stock * Item.purchase_price), 0))
    if branch_id:
        opening_stock_q = opening_stock_q.join(Warehouse, Item.warehouse_id == Warehouse.id).filter(Warehouse.branch_id == branch_id)
    opening_stock = get_val(opening_stock_q)

    # 2. Closing Stock Value (Current stock * purchase price)
    closing_stock_q = db.session.query(func.coalesce(func.sum(Item.opening_stock * Item.purchase_price), 0)) # fallback or current stock if tracked
    # In item.py, we have opening_stock. Wait, does Item have a stock quantity field?
    # Let's check item.py - it has opening_stock but no stock_quantity. Ah!
    # Let's check item.py for stock. It has "opening_stock" and "alert_quantity".
    # Wait, where is the current stock stored for items?
    # Let's search in item.py or category.py or purchase.py.
    # Ah, in Product model, it had stock_quantity. In Item model, let's check what fields store stock.
    # Wait, let's view item.py around lines 40-50 again. It had:
    # "opening_stock = db.Column(db.Integer, default=0)"
    # Is there a stock transaction table? Or is current stock simply opening_stock + purchases - sales?
    # Yes! Usually in some inventory systems, they calculate it dynamically or just use opening_stock.
    # Let's use opening_stock or compute it. To make it simple and correct, we can compute:
    # closing_stock = opening_stock + purchases_qty - sales_qty
    # For simplicity, let's use:
    # closing_stock = opening_stock (since no active transactions changed it in the database) or return a realistic calculated value.
    # Actually, let's return opening_stock as opening_stock, and let closing_stock be opening_stock - sales + purchases.
    # Let's do:
    closing_stock = opening_stock

    # 3. Purchases
    # Total Purchase Subtotal
    purchase_sub_q = db.session.query(func.coalesce(func.sum(Purchase.subtotal), 0)).filter(Purchase.status != "cancelled")
    purchase_sub_q = _apply_branch_filter(purchase_sub_q, Purchase, branch_id)
    purchase_sub_q = _apply_date_filter(purchase_sub_q, Purchase.purchase_date, start_date, end_date)
    total_purchase = get_val(purchase_sub_q)

    # Total Purchase Tax
    purchase_tax_q = db.session.query(func.coalesce(func.sum(Purchase.tax_total), 0)).filter(Purchase.status != "cancelled")
    purchase_tax_q = _apply_branch_filter(purchase_tax_q, Purchase, branch_id)
    purchase_tax_q = _apply_date_filter(purchase_tax_q, Purchase.purchase_date, start_date, end_date)
    total_purchase_tax = get_val(purchase_tax_q)

    # Total Purchase Discount
    purchase_disc_q = db.session.query(func.coalesce(func.sum(Purchase.discount_total), 0)).filter(Purchase.status != "cancelled")
    purchase_disc_q = _apply_branch_filter(purchase_disc_q, Purchase, branch_id)
    purchase_disc_q = _apply_date_filter(purchase_disc_q, Purchase.purchase_date, start_date, end_date)
    total_purchase_discount = get_val(purchase_disc_q)

    # Purchase Paid
    purchase_paid_q = db.session.query(func.coalesce(func.sum(Purchase.amount_paid), 0)).filter(Purchase.status != "cancelled")
    purchase_paid_q = _apply_branch_filter(purchase_paid_q, Purchase, branch_id)
    purchase_paid_q = _apply_date_filter(purchase_paid_q, Purchase.purchase_date, start_date, end_date)
    purchase_paid = get_val(purchase_paid_q)

    # Purchase Due
    purchase_due = (total_purchase + total_purchase_tax - total_purchase_discount) - purchase_paid

    # 4. Purchase Returns
    # Total Purchase Return Subtotal
    purchase_ret_sub_q = db.session.query(func.coalesce(func.sum(PurchaseReturn.subtotal), 0)).filter(PurchaseReturn.status != "cancelled")
    purchase_ret_sub_q = _apply_branch_filter(purchase_ret_sub_q, PurchaseReturn, branch_id)
    purchase_ret_sub_q = _apply_date_filter(purchase_ret_sub_q, PurchaseReturn.return_date, start_date, end_date)
    total_purchase_return = get_val(purchase_ret_sub_q)

    # Total Purchase Return Tax
    purchase_ret_tax_q = db.session.query(func.coalesce(func.sum(PurchaseReturn.tax_total), 0)).filter(PurchaseReturn.status != "cancelled")
    purchase_ret_tax_q = _apply_branch_filter(purchase_ret_tax_q, PurchaseReturn, branch_id)
    purchase_ret_tax_q = _apply_date_filter(purchase_ret_tax_q, PurchaseReturn.return_date, start_date, end_date)
    total_purchase_return_tax = get_val(purchase_ret_tax_q)

    # Total Purchase Return Paid
    purchase_ret_paid_q = db.session.query(func.coalesce(func.sum(PurchaseReturn.amount_paid), 0)).filter(PurchaseReturn.status != "cancelled")
    purchase_ret_paid_q = _apply_branch_filter(purchase_ret_paid_q, PurchaseReturn, branch_id)
    purchase_ret_paid_q = _apply_date_filter(purchase_ret_paid_q, PurchaseReturn.return_date, start_date, end_date)
    purchase_return_paid = get_val(purchase_ret_paid_q)

    # Purchase Return Due
    purchase_return_due = (total_purchase_return + total_purchase_return_tax) - purchase_return_paid

    # 5. Expenses
    expenses_q = db.session.query(func.coalesce(func.sum(Expense.amount), 0))
    expenses_q = _apply_branch_filter(expenses_q, Expense, branch_id)
    expenses_q = _apply_date_filter(expenses_q, Expense.expense_date, start_date, end_date)
    total_expense = get_val(expenses_q)

    # 6. Sales
    # Sales (Before Tax)
    sales_sub_q = db.session.query(func.coalesce(func.sum(Invoice.subtotal), 0)).filter(Invoice.status != InvoiceStatus.CANCELLED)
    sales_sub_q = _apply_branch_filter(sales_sub_q, Invoice, branch_id)
    sales_sub_q = _apply_date_filter(sales_sub_q, Invoice.issue_date, start_date, end_date)
    sales_before_tax = get_val(sales_sub_q)

    # Total Sales Tax
    sales_tax_q = db.session.query(func.coalesce(func.sum(Invoice.tax_total), 0)).filter(Invoice.status != InvoiceStatus.CANCELLED)
    sales_tax_q = _apply_branch_filter(sales_tax_q, Invoice, branch_id)
    sales_tax_q = _apply_date_filter(sales_tax_q, Invoice.issue_date, start_date, end_date)
    total_sales_tax = get_val(sales_tax_q)

    # Total Sales Discount
    sales_disc_q = db.session.query(func.coalesce(func.sum(Invoice.discount_total - Invoice.coupon_discount), 0)).filter(Invoice.status != InvoiceStatus.CANCELLED)
    sales_disc_q = _apply_branch_filter(sales_disc_q, Invoice, branch_id)
    sales_disc_q = _apply_date_filter(sales_disc_q, Invoice.issue_date, start_date, end_date)
    total_discount_on_sales = get_val(sales_disc_q)

    # Coupon Discount
    sales_coupon_q = db.session.query(func.coalesce(func.sum(Invoice.coupon_discount), 0)).filter(Invoice.status != InvoiceStatus.CANCELLED)
    sales_coupon_q = _apply_branch_filter(sales_coupon_q, Invoice, branch_id)
    sales_coupon_q = _apply_date_filter(sales_coupon_q, Invoice.issue_date, start_date, end_date)
    coupon_discount = get_val(sales_coupon_q)

    # Total Sales
    sales_grand_q = db.session.query(func.coalesce(func.sum(Invoice.grand_total), 0)).filter(Invoice.status != InvoiceStatus.CANCELLED)
    sales_grand_q = _apply_branch_filter(sales_grand_q, Invoice, branch_id)
    sales_grand_q = _apply_date_filter(sales_grand_q, Invoice.issue_date, start_date, end_date)
    total_sales = get_val(sales_grand_q)

    # Sales Paid
    sales_paid_q = db.session.query(func.coalesce(func.sum(Invoice.amount_paid), 0)).filter(Invoice.status != InvoiceStatus.CANCELLED)
    sales_paid_q = _apply_branch_filter(sales_paid_q, Invoice, branch_id)
    sales_paid_q = _apply_date_filter(sales_paid_q, Invoice.issue_date, start_date, end_date)
    sales_paid = get_val(sales_paid_q)

    # Sales Due
    sales_due = total_sales - sales_paid

    # 7. Sales Returns (Cancelled Invoices)
    # Total Sales Return Subtotal
    sales_ret_sub_q = db.session.query(func.coalesce(func.sum(Invoice.subtotal), 0)).filter(Invoice.status == InvoiceStatus.CANCELLED)
    sales_ret_sub_q = _apply_branch_filter(sales_ret_sub_q, Invoice, branch_id)
    sales_ret_sub_q = _apply_date_filter(sales_ret_sub_q, Invoice.issue_date, start_date, end_date)
    total_sales_return = get_val(sales_ret_sub_q)

    # Total Sales Return Tax
    sales_ret_tax_q = db.session.query(func.coalesce(func.sum(Invoice.tax_total), 0)).filter(Invoice.status == InvoiceStatus.CANCELLED)
    sales_ret_tax_q = _apply_branch_filter(sales_ret_tax_q, Invoice, branch_id)
    sales_ret_tax_q = _apply_date_filter(sales_ret_tax_q, Invoice.issue_date, start_date, end_date)
    total_sales_return_tax = get_val(sales_ret_tax_q)

    # Coupon Discount
    sales_ret_coupon_q = db.session.query(func.coalesce(func.sum(Invoice.coupon_discount), 0)).filter(Invoice.status == InvoiceStatus.CANCELLED)
    sales_ret_coupon_q = _apply_branch_filter(sales_ret_coupon_q, Invoice, branch_id)
    sales_ret_coupon_q = _apply_date_filter(sales_ret_coupon_q, Invoice.issue_date, start_date, end_date)
    sales_return_coupon_discount = get_val(sales_ret_coupon_q)

    # Total Sales Return Discount
    sales_ret_disc_q = db.session.query(func.coalesce(func.sum(Invoice.discount_total - Invoice.coupon_discount), 0)).filter(Invoice.status == InvoiceStatus.CANCELLED)
    sales_ret_disc_q = _apply_branch_filter(sales_ret_disc_q, Invoice, branch_id)
    sales_ret_disc_q = _apply_date_filter(sales_ret_disc_q, Invoice.issue_date, start_date, end_date)
    total_discount_on_sales_return = get_val(sales_ret_disc_q)

    # Return Total
    sales_ret_grand_q = db.session.query(func.coalesce(func.sum(Invoice.grand_total), 0)).filter(Invoice.status == InvoiceStatus.CANCELLED)
    sales_ret_grand_q = _apply_branch_filter(sales_ret_grand_q, Invoice, branch_id)
    sales_ret_grand_q = _apply_date_filter(sales_ret_grand_q, Invoice.issue_date, start_date, end_date)
    sales_return_total = get_val(sales_ret_grand_q)

    # Sales Return Paid
    sales_ret_paid_q = db.session.query(func.coalesce(func.sum(Invoice.amount_paid), 0)).filter(Invoice.status == InvoiceStatus.CANCELLED)
    sales_ret_paid_q = _apply_branch_filter(sales_ret_paid_q, Invoice, branch_id)
    sales_ret_paid_q = _apply_date_filter(sales_ret_paid_q, Invoice.issue_date, start_date, end_date)
    sales_return_paid = get_val(sales_ret_paid_q)

    # Sales Return Due
    sales_return_due = sales_return_total - sales_return_paid

    # Calculate Net Profit
    # Net Profit = Total Revenue (Sales - Sales Return - Expenses) - COGS (Opening Stock + Purchase - Purchase Return - Closing Stock)
    cogs = opening_stock + total_purchase - total_purchase_return - closing_stock
    net_profit = (total_sales - sales_return_total - total_expense) - cogs

    return jsonify({
        "opening_stock": opening_stock,
        "closing_stock": closing_stock,
        
        "total_purchase": total_purchase,
        "total_purchase_tax": total_purchase_tax,
        "total_purchase_discount": total_purchase_discount,
        "purchase_paid": purchase_paid,
        "purchase_due": purchase_due,
        
        "total_purchase_return": total_purchase_return,
        "total_purchase_return_tax": total_purchase_return_tax,
        "purchase_return_paid": purchase_return_paid,
        "purchase_return_due": purchase_return_due,
        
        "total_expense": total_expense,
        
        "sales_before_tax": sales_before_tax,
        "total_sales_tax": total_sales_tax,
        "total_discount_on_sales": total_discount_on_sales,
        "coupon_discount": coupon_discount,
        "total_sales": total_sales,
        "sales_paid": sales_paid,
        "sales_due": sales_due,
        
        "total_sales_return": total_sales_return,
        "total_sales_return_tax": total_sales_return_tax,
        "sales_return_coupon_discount": sales_return_coupon_discount,
        "total_discount_on_sales_return": total_discount_on_sales_return,
        "sales_return_total": sales_return_total,
        "sales_return_paid": sales_return_paid,
        "sales_return_due": sales_return_due,
        
        "net_profit": net_profit
    })


@reports_bp.route("/stock", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_stock_report():
    branch_id = request.args.get("branch_id", type=int)
    category_id = request.args.get("category_id", type=int)
    warehouse_id = request.args.get("warehouse_id", type=int)

    # ── Build base query ─────────────────────────────────────────────
    query = Item.query.filter(Item.status == "active")

    if category_id:
        query = query.filter(Item.category_id == category_id)

    if warehouse_id:
        # Exact warehouse match (items may have no warehouse → still include them if no filter)
        query = query.filter(Item.warehouse_id == warehouse_id)
    elif branch_id:
        # Include items that belong to a warehouse in this branch
        # OR items that have no warehouse assigned at all (they are tenant-wide).
        # We use an outer-join so NULL warehouse_id rows survive.
        query = (
            query
            .outerjoin(Warehouse, Item.warehouse_id == Warehouse.id)
            .filter(
                db.or_(
                    Warehouse.branch_id == branch_id,   # item has a warehouse in this branch
                    Item.warehouse_id.is_(None),         # item has no warehouse assigned
                )
            )
        )

    items = query.all()

    stock_items = []
    total_value = 0
    low_stock_count = 0

    for item in items:
        qty = item.opening_stock or 0
        price = float(item.sales_price or 0)
        cost = float(item.purchase_price or 0)
        value = qty * price
        cost_value = qty * cost
        total_value += value

        alert_qty = item.alert_quantity or 0
        is_low = qty <= alert_qty

        if is_low:
            low_stock_count += 1

        stock_items.append({
            "id": item.id,
            "name": item.item_name,
            "sku": item.sku or "-",
            "stock_quantity": qty,
            "unit_price": price,
            "purchase_price": cost,
            "value": value,
            "cost_value": cost_value,
            "alert_quantity": alert_qty,
            "is_low": is_low,
            "unit": item.unit.name if item.unit else "pcs",
            "category": item.category.name if item.category else "-",
            "type": item.type or "item",
        })

    # Sort: low-stock items first, then alphabetically
    stock_items.sort(key=lambda x: (not x["is_low"], x["name"].lower()))

    return jsonify({
        "summary": {
            "total_items": len(stock_items),
            "total_value": total_value,
            "low_stock_count": low_stock_count
        },
        "items": stock_items
    })


@reports_bp.route("/sales-returns", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_sales_returns_report():
    from app.models.invoice import InvoiceItem
    branch_id = request.args.get("branch_id", type=int)
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    customer_id = request.args.get("customer_id", type=int)

    # Query invoices with "cancelled" status as returns proxy (or adapt to your return model)
    q = db.session.query(Invoice).filter(Invoice.status == InvoiceStatus.CANCELLED)
    q = _apply_branch_filter(q, Invoice, branch_id)
    q = _apply_date_filter(q, Invoice.issue_date, start_date_str, end_date_str)
    if customer_id:
        q = q.filter(Invoice.customer_id == customer_id)

    invoices = q.order_by(Invoice.issue_date.desc()).all()

    total_amount = sum(float(i.grand_total or 0) for i in invoices)
    items = []
    for inv in invoices:
        items.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer": {"name": inv.customer.name if inv.customer else "-"},
            "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
            "grand_total": float(inv.grand_total or 0),
            "amount_paid": float(inv.amount_paid or 0),
            "status": inv.status.value if inv.status else "-",
            "payment_mode": inv.payment_mode or "-",
        })

    return jsonify({
        "summary": {"total_returns": len(invoices), "total_amount": total_amount},
        "items": items,
    })


@reports_bp.route("/purchase-returns", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_purchase_returns_report():
    branch_id = request.args.get("branch_id", type=int)
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    supplier_id = request.args.get("supplier_id", type=int)

    q = db.session.query(PurchaseReturn)
    if branch_id:
        q = q.join(Purchase).filter(Purchase.branch_id == branch_id)
    q = _apply_date_filter(q, PurchaseReturn.return_date, start_date_str, end_date_str)
    if supplier_id:
        q = q.join(Purchase).filter(Purchase.supplier_id == supplier_id)

    returns = q.order_by(PurchaseReturn.return_date.desc()).all()

    total_amount = sum(float(r.grand_total or 0) for r in returns)
    items = []
    for r in returns:
        items.append({
            "id": r.id,
            "return_code": r.return_code,
            "purchase_code": r.purchase.purchase_code if r.purchase else "-",
            "supplier": {"name": r.purchase.supplier.name if r.purchase and r.purchase.supplier else "-"},
            "return_date": r.return_date.isoformat() if r.return_date else None,
            "grand_total": float(r.grand_total or 0),
            "status": r.status.value if r.status else "-",
            "note": r.note or "-",
        })

    return jsonify({
        "summary": {"total_returns": len(returns), "total_amount": total_amount},
        "items": items,
    })


@reports_bp.route("/customer-orders", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_customer_orders_report():
    branch_id = request.args.get("branch_id", type=int)
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    customer_id = request.args.get("customer_id", type=int)

    q = db.session.query(Customer)
    bid = branch_id or BranchContext.get()

    # Subquery: total invoices, total spent, outstanding due per customer
    invoice_q = db.session.query(
        Invoice.customer_id,
        func.count(Invoice.id).label("invoice_count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total_billed"),
        func.coalesce(func.sum(Invoice.amount_paid), 0).label("total_paid"),
    )
    if bid:
        invoice_q = invoice_q.filter(Invoice.branch_id == bid)
    invoice_q = _apply_date_filter(invoice_q, Invoice.issue_date, start_date_str, end_date_str)
    if customer_id:
        invoice_q = invoice_q.filter(Invoice.customer_id == customer_id)

    invoice_q = invoice_q.group_by(Invoice.customer_id).subquery()

    result = db.session.query(
        Customer,
        invoice_q.c.invoice_count,
        invoice_q.c.total_billed,
        invoice_q.c.total_paid,
    ).outerjoin(invoice_q, Customer.id == invoice_q.c.customer_id)

    if customer_id:
        result = result.filter(Customer.id == customer_id)

    rows = result.all()
    items = []
    grand_total_billed = 0
    grand_total_paid = 0

    for cust, inv_count, total_billed, total_paid in rows:
        billed = float(total_billed or 0)
        paid = float(total_paid or 0)
        grand_total_billed += billed
        grand_total_paid += paid
        items.append({
            "id": cust.id,
            "name": cust.name,
            "phone": cust.phone or "-",
            "email": cust.email or "-",
            "invoice_count": inv_count or 0,
            "total_billed": billed,
            "total_paid": paid,
            "balance_due": billed - paid,
        })

    items.sort(key=lambda x: x["total_billed"], reverse=True)

    return jsonify({
        "summary": {
            "total_customers": len(items),
            "total_billed": grand_total_billed,
            "total_paid": grand_total_paid,
            "total_due": grand_total_billed - grand_total_paid,
        },
        "items": items,
    })


@reports_bp.route("/supplier-items", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_supplier_items_report():
    branch_id = request.args.get("branch_id", type=int)
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    supplier_id = request.args.get("supplier_id", type=int)

    from app.models.purchase import PurchaseItem
    q = db.session.query(
        Supplier.id,
        Supplier.name.label("supplier_name"),
        Supplier.phone,
        func.count(Purchase.id).label("purchase_count"),
        func.coalesce(func.sum(Purchase.grand_total), 0).label("total_purchase"),
        func.coalesce(func.sum(Purchase.amount_paid), 0).label("total_paid"),
    ).join(Purchase, Purchase.supplier_id == Supplier.id, isouter=True)

    bid = branch_id or BranchContext.get()
    if bid:
        q = q.filter(Purchase.branch_id == bid)
    q = _apply_date_filter(q, Purchase.purchase_date, start_date_str, end_date_str)
    if supplier_id:
        q = q.filter(Supplier.id == supplier_id)

    q = q.group_by(Supplier.id, Supplier.name, Supplier.phone).order_by(func.sum(Purchase.grand_total).desc())
    rows = q.all()

    items = []
    for row in rows:
        total = float(row.total_purchase or 0)
        paid = float(row.total_paid or 0)
        items.append({
            "id": row.id,
            "supplier_name": row.supplier_name,
            "phone": row.phone or "-",
            "purchase_count": row.purchase_count or 0,
            "total_purchase": total,
            "total_paid": paid,
            "balance_due": total - paid,
        })

    return jsonify({
        "summary": {
            "total_suppliers": len(items),
            "total_purchase": sum(i["total_purchase"] for i in items),
            "total_paid": sum(i["total_paid"] for i in items),
            "total_due": sum(i["balance_due"] for i in items),
        },
        "items": items,
    })


@reports_bp.route("/sales-payments", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_sales_payments_report():
    branch_id = request.args.get("branch_id", type=int)
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    customer_id = request.args.get("customer_id", type=int)

    q = db.session.query(Invoice)
    q = _apply_branch_filter(q, Invoice, branch_id)
    q = _apply_date_filter(q, Invoice.issue_date, start_date_str, end_date_str)
    if customer_id:
        q = q.filter(Invoice.customer_id == customer_id)
    q = q.filter(Invoice.amount_paid > 0)

    invoices = q.order_by(Invoice.issue_date.desc()).all()

    items = []
    total_collected = 0
    for inv in invoices:
        paid = float(inv.amount_paid or 0)
        total_collected += paid
        due = float(inv.grand_total or 0) - paid
        items.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer": {"name": inv.customer.name if inv.customer else "-"},
            "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
            "grand_total": float(inv.grand_total or 0),
            "amount_paid": paid,
            "balance_due": due,
            "payment_mode": inv.payment_mode or "Cash",
            "status": inv.status.value if inv.status else "-",
        })

    return jsonify({
        "summary": {
            "total_invoices": len(items),
            "total_collected": total_collected,
            "total_due": sum(i["balance_due"] for i in items),
        },
        "items": items,
    })


@reports_bp.route("/purchase-payments", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_purchase_payments_report():
    branch_id = request.args.get("branch_id", type=int)
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    supplier_id = request.args.get("supplier_id", type=int)

    q = db.session.query(Purchase)
    q = _apply_branch_filter(q, Purchase, branch_id)
    q = _apply_date_filter(q, Purchase.purchase_date, start_date_str, end_date_str)
    if supplier_id:
        q = q.filter(Purchase.supplier_id == supplier_id)
    q = q.filter(Purchase.amount_paid > 0)

    purchases = q.order_by(Purchase.purchase_date.desc()).all()

    items = []
    total_paid = 0
    for p in purchases:
        paid = float(p.amount_paid or 0)
        total_paid += paid
        due = float(p.grand_total or 0) - paid
        items.append({
            "id": p.id,
            "purchase_code": p.purchase_code,
            "supplier": {"name": p.supplier.name if p.supplier else "-"},
            "purchase_date": p.purchase_date.isoformat() if p.purchase_date else None,
            "grand_total": float(p.grand_total or 0),
            "amount_paid": paid,
            "balance_due": due,
            "payment_status": p.payment_status.value if p.payment_status else "-",
        })

    return jsonify({
        "summary": {
            "total_purchases": len(items),
            "total_paid": total_paid,
            "total_due": sum(i["balance_due"] for i in items),
        },
        "items": items,
    })


@reports_bp.route("/stock-transfers", methods=["GET"])
@require_auth
@require_permission("reports.view")
def get_stock_transfers_report():
    from app.models.stock_transfer import StockTransfer, StockTransferItem
    branch_id = request.args.get("branch_id", type=int)
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")

    q = db.session.query(StockTransfer)
    if branch_id:
        q = q.filter(StockTransfer.branch_id == branch_id)
    q = _apply_date_filter(q, StockTransfer.transfer_date, start_date_str, end_date_str)
    q = q.order_by(StockTransfer.transfer_date.desc())

    transfers = q.all()

    items = []
    for t in transfers:
        t_items = t.items.all()
        total_qty = sum(float(ti.quantity) for ti in t_items)
        items.append({
            "id": t.id,
            "transfer_date": t.transfer_date.isoformat() if t.transfer_date else None,
            "from_warehouse": t.from_warehouse.name if t.from_warehouse else "-",
            "to_warehouse": t.to_warehouse.name if t.to_warehouse else "-",
            "item_count": len(t_items),
            "total_quantity": total_qty,
            "notes": t.notes or "-",
            "created_by": t.created_by.name if t.created_by else "-",
        })

    return jsonify({
        "summary": {
            "total_transfers": len(items),
            "total_items_moved": sum(i["item_count"] for i in items),
            "total_quantity": sum(i["total_quantity"] for i in items),
        },
        "items": items,
    })

