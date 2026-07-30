// src/components/PurchaseReceiptModal.tsx

import { useRef } from "react";
import { Printer, X, Phone, Mail, FileText, Building2, Calendar, User, ShieldCheck } from "lucide-react";
import type { Purchase } from "../api/purchases";
import { formatMoney } from "../utils/format";
import { useStoreProfile } from "../hooks/useStoreProfile";

interface Props {
  purchase: Purchase;
  onClose: () => void;
}

function formatDateStr(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_CLASSES: Record<string, string> = {
  received: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  ordered:  "bg-blue-100 text-blue-700 border border-blue-200",
  draft:    "bg-slate-100 text-slate-600 border border-slate-200",
  partial:  "bg-amber-100 text-amber-700 border border-amber-200",
  cancelled:"bg-red-100 text-red-700 border border-red-200",
};

const PAYMENT_CLASSES: Record<string, string> = {
  paid:    "bg-emerald-100 text-emerald-700 border border-emerald-200",
  partial: "bg-amber-100 text-amber-700 border border-amber-200",
  pending: "bg-amber-100 text-amber-700 border border-amber-200", // matching the yellow PENDING in screenshot
};

const STATUS_PRINTS: Record<string, string> = {
  received: "background:#d1fae5;color:#047857;border:1px solid #a7f3d0",
  ordered:  "background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe",
  draft:    "background:#f1f5f9;color:#475569;border:1px solid #e2e8f0",
  partial:  "background:#fef3c7;color:#b45309;border:1px solid #fde68a",
  cancelled:"background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5",
};

const PAYMENT_PRINTS: Record<string, string> = {
  paid:    "background:#d1fae5;color:#047857;border:1px solid #a7f3d0",
  partial: "background:#fef3c7;color:#b45309;border:1px solid #fde68a",
  pending: "background:#fef3c7;color:#b45309;border:1px solid #fde68a",
};

const RECEIPT_STYLES = `
            .receipt{max-width:800px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff}
            .receipt *{box-sizing:border-box}

            /* Header Section */
            .header-sec{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
            .logo-wrap{display:flex;align-items:center;gap:12px}
            .logo-icon{width:44px;height:44px;background:#1e6fa8;border-radius:12px;display:flex;align-items:center;justify-content:center}
            .logo-icon svg{color:#fff;width:24px;height:24px}
            .brand-name{font-size:22px;font-weight:800;color:#1e6fa8;line-height:1.2}
            .brand-sub{font-size:12px;color:#64748b}
            
            .header-right{text-align:right}
            .doc-title{font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-0.025em;text-transform:uppercase;margin-bottom:8px}
            .badge-row{display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px}
            .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase}
            .code-badge{background:#1e6fa8;color:#fff}
            .meta-row{font-size:12px;color:#64748b;display:flex;flex-direction:column;gap:4px;align-items:flex-end}
            .meta-item{display:flex;align-items:center;gap:6px}
            .meta-item svg{width:13px;height:13px;color:#94a3b8}

            /* Cards Grid */
            .grid-cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
            .card{border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#fff}
            .card-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#1e6fa8;letter-spacing:0.05em;display:flex;align-items:center;gap:8px;margin-bottom:12px}
            .card-title svg{width:14px;height:14px}
            .supplier-name{font-size:16px;font-weight:800;color:#0f172a;margin-bottom:10px}
            .supplier-info{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155}
            .info-item{display:flex;align-items:center;gap:8px}
            .info-item svg{width:14px;height:14px;color:#94a3b8}
            
            .row-align{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#334155;margin-bottom:8px}
            .row-align:last-child{margin-bottom:0}
            .dotted-sep{border-top:1px dotted #cbd5e1;margin:12px 0}
            .bal-due-row{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:800;color:#dc2626}

            /* Table Section */
            table{width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
            thead tr{background:#1e6fa8}
            thead th{padding:10px 12px;text-align:left;font-weight:700;font-size:11px;color:#fff;text-transform:uppercase;border:1px solid #1a5f90}
            tbody tr{border-bottom:1px solid #e2e8f0}
            tbody td{padding:10px 12px;color:#334155;font-size:13px;border:1px solid #e2e8f0}
            .text-center{text-align:center}
            .text-right{text-align:right}

            /* Totals Section */
            .totals-block{display:flex;justify-content:flex-end;margin-bottom:24px}
            .totals-table{width:320px;border-collapse:collapse;border:1px solid #e2e8f0;background:#f8fafc}
            .totals-table td{padding:8px 16px;font-size:13px;color:#475569;border:1px solid #e2e8f0}
            .totals-table tr.grand-row td{background:#fff;font-weight:800;font-size:16px;color:#1e6fa8;border-top:2px solid #1e6fa8}

            /* Footer Section */
            .footer-card{border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
            .footer-left{display:flex;align-items:center;gap:12px}
            .footer-left svg{width:20px;height:20px;color:#1e6fa8}
            .footer-msg{font-size:13px;font-weight:700;color:#334155}
            .footer-sub{font-size:11px;color:#64748b;margin-top:2px}
            .sign-wrap{text-align:center;width:180px}
            .sign-img{font-family:'Dancing Script','Brush Script MT',cursive;font-size:20px;color:#1e293b;margin-bottom:4px;font-style:italic}
            .sign-line{border-top:1px dotted #94a3b8;margin-top:4px;padding-top:4px;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.05em}
`;

export function PurchaseReceiptModal({ purchase, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: store } = useStoreProfile();

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Purchase Receipt – ${purchase.purchase_code}</title>
          <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:24px}
            ${RECEIPT_STYLES}
            @media print{
              body{padding:0}
              .receipt{border:0;box-shadow:none;padding:0}
              @page{margin:15mm}
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const balanceDue = Math.max(0, purchase.grand_total - purchase.amount_paid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex h-[94vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">

        {/* ── Top Header Toolbar ────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Purchase Receipt</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-[#1e6fa8] px-4.5 py-2 text-sm font-bold text-white hover:bg-[#185d8e] transition-all shadow-sm active:scale-95"
            >
              <Printer size={15} />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm active:scale-95"
            >
              <X size={15} />
              Close
            </button>
          </div>
        </div>

        {/* ── Scrollable Receipt Template ─────────────────────── */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100/40">
          <style>{RECEIPT_STYLES}</style>
          <div ref={printRef} className="receipt">
              {/* Header */}
              <div className="header-sec">
                <div className="logo-wrap">
                  {store?.store_logo ? (
                    <img src={store.store_logo} alt={store.company_name} style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 12 }} />
                  ) : (
                    <div className="logo-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                        <path d="M6 6h10M6 10h10" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="brand-name">{store?.company_name || "BillBook"}</h3>
                    <p className="brand-sub">{store?.address || "Business made simple"}</p>
                  </div>
                </div>
                
                <div className="header-right">
                  <h1 className="doc-title">Purchase Receipt</h1>
                  <div className="badge-row">
                    <span className="badge code-badge">{purchase.purchase_code}</span>
                    <span className={`badge ${STATUS_CLASSES[purchase.status] || "bg-slate-100 text-slate-600"}`}
                          style={STATUS_PRINTS[purchase.status] ? { ...(Object.fromEntries(STATUS_PRINTS[purchase.status].split(";").map(s => s.split(":") as [string, string]))) } : {}}>
                      {purchase.status}
                    </span>
                  </div>
                  <div className="meta-row">
                    <div className="meta-item">
                      <Calendar />
                      <span>Date: {formatDateStr(purchase.purchase_date)}</span>
                    </div>
                    {purchase.creator_name && (
                      <div className="meta-item">
                        <User />
                        <span>Created by: {purchase.creator_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Cards Side-By-Side */}
              <div className="grid-cards">
                {/* Card 1: Supplier */}
                <div className="card">
                  <div className="card-title">
                    <User />
                    <span>Supplier Details</span>
                  </div>
                  <h4 className="supplier-name">{purchase.supplier?.name || "—"}</h4>
                  <div className="supplier-info">
                    {purchase.supplier?.mobile && (
                      <div className="info-item">
                        <Phone />
                        <span>{purchase.supplier.mobile}</span>
                      </div>
                    )}
                    {purchase.supplier?.email && (
                      <div className="info-item">
                        <Mail />
                        <span>{purchase.supplier.email}</span>
                      </div>
                    )}
                    {purchase.supplier?.gst_number && (
                      <div className="info-item">
                        <FileText />
                        <span>GST: {purchase.supplier.gst_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 2: Warehouse / Payment */}
                <div className="card">
                  <div className="card-title">
                    <Building2 />
                    <span>Warehouse / Payment</span>
                  </div>
                  <div className="supplier-info">
                    <div className="row-align">
                      <span>Warehouse:</span>
                      <span className="font-bold text-slate-700">
                        {purchase.warehouse?.name || "—"}
                      </span>
                    </div>
                    <div className="row-align">
                      <span>Payment Status:</span>
                      <span className={`badge ${PAYMENT_CLASSES[purchase.payment_status] || "bg-slate-100 text-slate-600"}`}
                            style={PAYMENT_PRINTS[purchase.payment_status] ? { ...(Object.fromEntries(PAYMENT_PRINTS[purchase.payment_status].split(";").map(s => s.split(":") as [string, string]))) } : {}}>
                        {purchase.payment_status}
                      </span>
                    </div>
                    <div className="row-align">
                      <span>Paid:</span>
                      <span className="font-semibold text-slate-700">{formatMoney(purchase.amount_paid)}</span>
                    </div>
                    
                    <div className="dotted-sep"></div>
                    
                    <div className="bal-due-row">
                      <span>Balance Due:</span>
                      <span>{formatMoney(balanceDue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table>
                <thead>
                  <tr>
                    <th className="text-center" style={{ width: "50px" }}>#</th>
                    <th>Description</th>
                    <th className="text-center" style={{ width: "80px" }}>Qty</th>
                    <th className="text-right" style={{ width: "120px" }}>Price</th>
                    <th className="text-center" style={{ width: "100px" }}>Discount</th>
                    <th className="text-center" style={{ width: "100px" }}>Tax</th>
                    <th className="text-right" style={{ width: "130px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchase.items ?? []).map((item, i) => (
                    <tr key={i}>
                      <td className="text-center text-slate-400">{i + 1}</td>
                      <td className="font-bold text-slate-800">{item.description}</td>
                      <td className="text-center font-semibold">{item.quantity}</td>
                      <td className="text-right">{formatMoney(item.purchase_price)}</td>
                      <td className="text-center text-emerald-600 font-medium">
                        {item.discount ? `-${formatMoney(item.discount)}` : "—"}
                      </td>
                      <td className="text-center text-slate-500">
                        {item.tax_amount ? formatMoney(item.tax_amount) : "—"}
                      </td>
                      <td className="text-right font-extrabold text-slate-900">
                        {formatMoney(item.line_total ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="totals-block">
                <table className="totals-table">
                  <tbody>
                    <tr>
                      <td>Subtotal</td>
                      <td className="text-right font-semibold text-slate-700">
                        {formatMoney(purchase.subtotal)}
                      </td>
                    </tr>
                    {purchase.discount_total > 0 && (
                      <tr>
                        <td className="text-emerald-600">Discount</td>
                        <td className="text-right font-semibold text-emerald-600">
                          -{formatMoney(purchase.discount_total)}
                        </td>
                      </tr>
                    )}
                    {purchase.tax_total > 0 && (
                      <tr>
                        <td className="text-blue-600">Tax</td>
                        <td className="text-right font-semibold text-blue-600">
                          {formatMoney(purchase.tax_total)}
                        </td>
                      </tr>
                    )}
                    {purchase.other_charges_total > 0 && (
                      <tr>
                        <td>{purchase.other_charges_type || "Other Charges"}</td>
                        <td className="text-right font-semibold text-slate-700">
                          {formatMoney(purchase.other_charges_total)}
                        </td>
                      </tr>
                    )}
                    {purchase.round_off !== 0 && (
                      <tr>
                        <td>Round Off</td>
                        <td className="text-right font-semibold text-slate-700">
                          {formatMoney(purchase.round_off)}
                        </td>
                      </tr>
                    )}
                    <tr className="grand-row">
                      <td className="font-extrabold">GRAND TOTAL</td>
                      <td className="text-right font-extrabold text-[#1e6fa8]">
                        {formatMoney(purchase.grand_total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer Panel */}
              <div className="footer-card">
                <div className="footer-left">
                  <ShieldCheck />
                  <div>
                    <p className="footer-msg">Thank you for your business!</p>
                    <p className="footer-sub">Generated by {store?.company_name || "BillBook"}</p>
                  </div>
                </div>
                <div className="sign-wrap">
                  {store?.show_signature && store?.signature ? (
                    <img src={store.signature} alt="Signature" style={{ height: 40, maxWidth: 180, objectFit: "contain", margin: "0 auto 4px" }} />
                  ) : (
                    <div className="sign-img">{purchase.creator_name || "Authorized"}</div>
                  )}
                  <div className="sign-line">Authorised Signatory</div>
                </div>
              </div>
            </div>
          </div>

      </div>
    </div>
  );
}
