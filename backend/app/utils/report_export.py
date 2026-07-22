"""
Real PDF (reportlab) and Excel (openpyxl) generation for the Reports page.
Driven by a single column-spec table (REPORT_COLUMNS) so both formats stay
in sync with the JSON each /api/v1/reports/* endpoint already returns —
no report query logic is duplicated here.
"""

from datetime import datetime
from io import BytesIO

from flask import send_file
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

REPORT_TITLES = {
    "sales": "Sales Report",
    "purchases": "Purchases Report",
    "expenses": "Expenses Report",
    "profit_loss": "Profit & Loss Report",
    "stock": "Inventory Valuation Report",
    "sales_returns": "Sales Returns Report",
    "purchase_returns": "Purchase Returns Report",
    "customer_orders": "Customer Orders Report",
    "supplier_items": "Supplier Purchases Report",
    "sales_payments": "Sales Payments Report",
    "purchase_payments": "Purchase Payments Report",
    "stock_transfers": "Stock Transfers Report",
}

# report_type -> [(column header, dotted path into each item dict), ...]
REPORT_COLUMNS = {
    "sales": [
        ("Invoice No", "invoice_number"), ("Customer", "customer.name"), ("Date", "issue_date"),
        ("Subtotal", "subtotal"), ("CGST", "cgst_total"), ("SGST", "sgst_total"), ("IGST", "igst_total"),
        ("Tax", "tax_total"), ("Discount", "discount_total"), ("Grand Total", "grand_total"),
        ("Paid", "amount_paid"), ("Due", "balance_due"), ("Status", "status"),
    ],
    "purchases": [
        ("Purchase Code", "purchase_code"), ("Supplier", "supplier.name"), ("Date", "purchase_date"),
        ("Subtotal", "subtotal"), ("Tax", "tax_total"), ("Discount", "discount_total"),
        ("Grand Total", "grand_total"), ("Paid", "amount_paid"), ("Due", "balance_due"), ("Status", "status"),
    ],
    "expenses": [
        ("Date", "expense_date"), ("Category", "category_name"), ("Amount", "amount"),
        ("Reference", "reference_no"), ("Notes", "notes"),
    ],
    "stock": [
        ("Item", "name"), ("SKU", "sku"), ("Category", "category"), ("Type", "type"),
        ("Stock Qty", "stock_quantity"), ("Unit Price", "unit_price"), ("Purchase Price", "purchase_price"),
        ("Stock Value", "value"), ("Cost Value", "cost_value"), ("Low Stock", "is_low"),
    ],
    "sales_returns": [
        ("Invoice No", "invoice_number"), ("Customer", "customer.name"), ("Date", "issue_date"),
        ("Grand Total", "grand_total"), ("Paid", "amount_paid"), ("Payment Mode", "payment_mode"),
        ("Status", "status"),
    ],
    "purchase_returns": [
        ("Return Code", "return_code"), ("Purchase Code", "purchase_code"), ("Supplier", "supplier.name"),
        ("Date", "return_date"), ("Grand Total", "grand_total"), ("Status", "status"), ("Note", "note"),
    ],
    "customer_orders": [
        ("Customer", "name"), ("Phone", "phone"), ("Email", "email"), ("Invoices", "invoice_count"),
        ("Total Billed", "total_billed"), ("Total Paid", "total_paid"), ("Balance Due", "balance_due"),
    ],
    "supplier_items": [
        ("Supplier", "supplier_name"), ("Phone", "phone"), ("Purchases", "purchase_count"),
        ("Total Purchase", "total_purchase"), ("Total Paid", "total_paid"), ("Balance Due", "balance_due"),
    ],
    "sales_payments": [
        ("Invoice No", "invoice_number"), ("Customer", "customer.name"), ("Date", "issue_date"),
        ("Grand Total", "grand_total"), ("Paid", "amount_paid"), ("Due", "balance_due"),
        ("Payment Mode", "payment_mode"), ("Status", "status"),
    ],
    "purchase_payments": [
        ("Purchase Code", "purchase_code"), ("Supplier", "supplier.name"), ("Date", "purchase_date"),
        ("Grand Total", "grand_total"), ("Paid", "amount_paid"), ("Due", "balance_due"),
        ("Payment Status", "payment_status"),
    ],
    "stock_transfers": [
        ("Date", "transfer_date"), ("From", "from_warehouse"), ("To", "to_warehouse"),
        ("Items", "item_count"), ("Qty Moved", "total_quantity"), ("Notes", "notes"), ("By", "created_by"),
    ],
}


def _get_path(obj, dotted_path):
    """Reads a dotted path ("customer.name") out of a nested dict, tolerating missing/None."""
    value = obj
    for part in dotted_path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


# Leading characters spreadsheet apps treat as "this cell is a formula".
# Any user-controlled string (customer/item names, notes, etc.) starting
# with one of these would otherwise be written as a LIVE formula by
# openpyxl and execute when the exported file is opened in Excel/LibreOffice
# — classic CSV/formula injection (data exfiltration via HYPERLINK, etc.).
_FORMULA_TRIGGER_CHARS = ("=", "+", "-", "@", "\t", "\r")


def _sanitize_excel_cell(value):
    """Neutralizes formula injection by prefixing a leading apostrophe, which
    forces spreadsheet apps to treat the cell as literal text."""
    if isinstance(value, str) and value.startswith(_FORMULA_TRIGGER_CHARS):
        return "'" + value
    return value


def _fmt(value):
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, float):
        return f"{value:,.2f}"
    return str(value)


def _summary_rows(data):
    """summary dict for most reports; the whole flat dict for profit_loss."""
    summary = data.get("summary") if isinstance(data, dict) else None
    if summary is None and "items" not in data:
        summary = data  # profit_loss: flat dict, no items/summary wrapper
    if not summary:
        return []
    return [(k.replace("_", " ").title(), _fmt(v)) for k, v in summary.items()]


def _period_label(filters):
    start, end = filters.get("start_date"), filters.get("end_date")
    if start or end:
        return f"Period: {start or '—'} to {end or '—'}"
    return None


def build_pdf_response(report_type, data, filters):
    buf = BytesIO()
    title = REPORT_TITLES.get(report_type, report_type.replace("_", " ").title())
    cols = REPORT_COLUMNS.get(report_type)
    items = data.get("items") if isinstance(data, dict) else None

    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4) if items else A4,
        title=title,
        topMargin=15 * mm, bottomMargin=15 * mm, leftMargin=12 * mm, rightMargin=12 * mm,
    )
    styles = getSampleStyleSheet()
    elements = [Paragraph(title, styles["Title"])]
    elements.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
    period = _period_label(filters)
    if period:
        elements.append(Paragraph(period, styles["Normal"]))
    elements.append(Spacer(1, 10))

    summary_rows = _summary_rows(data)
    if summary_rows:
        table_data = [["Metric", "Value"]] + summary_rows
        t = Table(table_data, colWidths=[80 * mm, 60 * mm])
        t.setStyle(_TABLE_STYLE)
        elements.append(t)
        elements.append(Spacer(1, 14))

    if items and cols:
        header = [c[0] for c in cols]
        rows = [[_fmt(_get_path(item, c[1])) for c in cols] for item in items]
        t = Table([header] + rows, repeatRows=1)
        t.setStyle(_TABLE_STYLE)
        elements.append(t)

    doc.build(elements)
    buf.seek(0)
    return send_file(
        buf, as_attachment=True, download_name=f"{report_type}_report.pdf", mimetype="application/pdf"
    )


_TABLE_STYLE = TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D9488")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
])


def build_excel_response(report_type, data, filters):
    title = REPORT_TITLES.get(report_type, report_type.replace("_", " ").title())
    cols = REPORT_COLUMNS.get(report_type)
    items = data.get("items") if isinstance(data, dict) else None

    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]  # Excel sheet name limit

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="0D9488")

    row = 1
    ws.cell(row=row, column=1, value=title).font = Font(bold=True, size=14)
    row += 1
    ws.cell(row=row, column=1, value=f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    row += 1
    period = _period_label(filters)
    if period:
        ws.cell(row=row, column=1, value=period)
        row += 1
    row += 1

    summary_rows = _summary_rows(data)
    if summary_rows:
        ws.cell(row=row, column=1, value="Metric").font = header_font
        ws.cell(row=row, column=1).fill = header_fill
        ws.cell(row=row, column=2, value="Value").font = header_font
        ws.cell(row=row, column=2).fill = header_fill
        row += 1
        for label, value in summary_rows:
            ws.cell(row=row, column=1, value=_sanitize_excel_cell(label))
            ws.cell(row=row, column=2, value=_sanitize_excel_cell(value))
            row += 1
        row += 1

    if items and cols:
        header_row = row
        for i, (label, _) in enumerate(cols, start=1):
            cell = ws.cell(row=header_row, column=i, value=label)
            cell.font = header_font
            cell.fill = header_fill
        row += 1
        for item in items:
            for i, (_, path) in enumerate(cols, start=1):
                ws.cell(row=row, column=i, value=_sanitize_excel_cell(_get_path(item, path)))
            row += 1
        ws.freeze_panes = ws.cell(row=header_row + 1, column=1).coordinate
        for i in range(1, len(cols) + 1):
            ws.column_dimensions[get_column_letter(i)].width = 18

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return send_file(
        buf,
        as_attachment=True,
        download_name=f"{report_type}_report.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
