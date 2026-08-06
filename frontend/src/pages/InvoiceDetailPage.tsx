import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, CreditCard, ChevronDown, Trash2, Calendar, FileText } from "lucide-react";
import { useInvoice, useUpdateInvoice, useDeleteInvoice, useRecordPayment } from "../hooks/useInvoices";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Modal } from "../components/ui/Modal";
import { DemoGuard } from "../components/DemoGuard";
import { formatMoney, formatDate } from "../utils/format";
import type { InvoiceStatus } from "../types";
import { useTranslation } from "../context/LanguageContext";
import { useStoreProfile } from "../hooks/useStoreProfile";

export function InvoiceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const invoiceId = id ? Number(id) : undefined;

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: store } = useStoreProfile();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const recordPayment = useRecordPayment();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  if (isLoading || !invoice) {
    return <div className="h-96 animate-pulse rounded-xl bg-slate-100" />;
  }

  const handleStatusChange = (status: InvoiceStatus) => {
    if (!invoiceId) return;
    updateInvoice.mutate(
      { id: invoiceId, payload: { status } },
      {
        onSuccess: () => {
          setShowStatusDropdown(false);
        },
      }
    );
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !paymentAmount) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;
    recordPayment.mutate(
      { id: invoiceId, amount: amt, payment_mode: paymentMode },
      {
        onSuccess: () => {
          setIsPaymentOpen(false);
          setPaymentAmount("");
          setPaymentMode("Cash");
        },
      }
    );
  };

  const handleDeleteInvoice = () => {
    if (!invoiceId) return;
    if (confirm(t("Are you sure you want to permanently delete this invoice? This action cannot be undone."))) {
      deleteInvoice.mutate(invoiceId, {
        onSuccess: () => {
          navigate("/invoices");
        },
      });
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/invoices" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink-900 transition-colors">
          <ArrowLeft size={16} />
          {t("Back to sales")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Change Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <span>{t("Change Status")}</span>
              <ChevronDown size={14} />
            </button>
            {showStatusDropdown && (
              <div className="absolute right-0 mt-1.5 w-36 rounded-lg border border-slate-100 bg-white p-1 shadow-lg z-20">
                {(["draft", "pending", "paid", "overdue", "cancelled"] as InvoiceStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className="w-full rounded-md px-3 py-1.5 text-left text-xs font-semibold capitalize text-slate-700 hover:bg-slate-50 hover:text-ink-900"
                  >
                    {t(st)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Record Payment Button */}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <button
              onClick={() => setIsPaymentOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark shadow-sm"
            >
              <CreditCard size={15} />
              {t("Record Payment")}
            </button>
          )}

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Printer size={15} />
            {t("Print Invoice")}
          </button>

          {/* Delete Button */}
          <DemoGuard>
            <button
              onClick={handleDeleteInvoice}
              className="flex items-center gap-1.5 rounded-lg border border-danger-light bg-danger-light/50 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-light transition-colors shadow-sm"
            >
              <Trash2 size={15} />
              {t("Delete")}
            </button>
          </DemoGuard>
        </div>
      </div>

      {/* ── Printable Invoice ───────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none print:p-0">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              {store?.store_logo ? (
                <img src={store.store_logo} alt={store.company_name} className="h-8 w-8 rounded object-contain" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded bg-brand">
                  <FileText size={15} className="text-white" />
                </div>
              )}
              <div>
                <span className="text-sm font-bold tracking-tight text-ink-900">{store?.company_name || t("BillBook Invoice")}</span>
                {store?.gstin && <p className="text-[11px] text-slate-400">{t("GSTIN")}: {store.gstin}</p>}
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight pt-1">
              {t("Invoice")} #{invoice.invoice_number}
            </h1>
            <div className="pt-1">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
          <div className="text-sm text-slate-500 sm:text-right space-y-1">
            <div className="flex items-center gap-1.5 sm:justify-end">
              <Calendar size={13} className="text-slate-400" />
              <span>{t("Issued")}: {formatDate(invoice.issue_date)}</span>
            </div>
            {invoice.due_date && (
              <p className="font-medium text-amber-600">{t("Due")}: {formatDate(invoice.due_date)}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Billed To")}</p>
            <p className="mt-1.5 text-base font-bold text-ink-900">{invoice.customer?.name}</p>
            {invoice.customer?.billing_address && (
              <p className="mt-1 text-sm text-slate-500 leading-relaxed max-w-xs">{invoice.customer.billing_address}</p>
            )}
            <div className="mt-2 text-xs text-slate-400 space-y-0.5">
              {invoice.customer?.email && <p>{t("Email")}: {invoice.customer.email}</p>}
              {invoice.customer?.phone && <p>{t("Phone")}: {invoice.customer.phone}</p>}
              {invoice.customer?.gstin && <p className="font-mono text-ink-700">{t("GSTIN")}: {invoice.customer.gstin}</p>}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">{t("Description")}</th>
                <th className="py-2.5 px-3 text-right">{t("Qty")}</th>
                <th className="py-2.5 px-3 text-right">{t("Unit Price")}</th>
                <th className="py-2.5 px-3 text-right">{t("Tax Rate")}</th>
                <th className="py-2.5 px-3 text-right">{t("Amount")}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-medium text-ink-700">{item.description}</td>
                  <td className="figures py-3 px-3 text-right text-slate-500">{item.quantity}</td>
                  <td className="figures py-3 px-3 text-right text-slate-500">
                    {formatMoney(item.unit_price)}
                  </td>
                  <td className="figures py-3 px-3 text-right text-slate-400">{item.tax_rate}%</td>
                  <td className="figures py-3 px-3 text-right font-semibold text-ink-900">
                    {formatMoney(item.line_total ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="ml-auto mt-4 w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>{t("Subtotal")}</span>
            <span className="figures font-medium">{formatMoney(invoice.subtotal)}</span>
          </div>
          {invoice.igst_total > 0 ? (
            <div className="flex justify-between text-slate-500">
              <span>{t("IGST")}</span>
              <span className="figures font-medium">{formatMoney(invoice.igst_total)}</span>
            </div>
          ) : invoice.cgst_total > 0 || invoice.sgst_total > 0 ? (
            <>
              <div className="flex justify-between text-slate-500">
                <span>{t("CGST")}</span>
                <span className="figures font-medium">{formatMoney(invoice.cgst_total)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t("SGST")}</span>
                <span className="figures font-medium">{formatMoney(invoice.sgst_total)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-500">
              <span>{t("Tax")}</span>
              <span className="figures font-medium">{formatMoney(invoice.tax_total)}</span>
            </div>
          )}
          {invoice.discount_total > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>{t("Discount")}</span>
              <span className="figures">-{formatMoney(invoice.discount_total)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2.5 text-base font-bold text-ink-900">
            <span>{t("Total")}</span>
            <span className="figures text-lg">{formatMoney(invoice.grand_total)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>{t("Amount Paid")}</span>
            <span className="figures font-medium">{formatMoney(invoice.amount_paid)}</span>
          </div>
          <div className="flex justify-between pt-1 font-bold text-danger">
            <span>{t("Balance Due")}</span>
            <span className="figures">{formatMoney(invoice.balance_due)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-8 border-t border-slate-100 pt-4 text-sm text-slate-500">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Notes / Comments")}</p>
            <p className="whitespace-pre-line leading-relaxed">{invoice.notes}</p>
          </div>
        )}

        {store?.show_signature && store?.signature && (
          <div className="mt-8 flex justify-end">
            <div className="text-center">
              <img src={store.signature} alt={t("Signature")} className="mx-auto h-16 max-w-[180px] object-contain" />
              <p className="mt-1 border-t border-slate-300 pt-1 text-xs text-slate-500">{t("Authorized Signatory")}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Record Payment Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title={t("Record Payment")}
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-slate-500 mb-2">
              {t("Enter the amount collected from the customer. The balance due is")}{" "}
              <strong className="text-ink-900 font-bold">{formatMoney(invoice.balance_due)}</strong>.
            </p>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Payment Amount")} (₹)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder={t("e.g. 500.00")}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand mb-4"
            />
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Payment Mode")}</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPaymentOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={recordPayment.isPending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {recordPayment.isPending ? t("Recording…") : t("Record Payment")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}