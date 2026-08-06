import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, Trash2, Calendar, FileText, ChevronDown, ChevronUp, FileOutput } from "lucide-react";
import { useQuotation, useDeleteQuotation, useConvertQuotationToInvoice, useUpdateQuotation } from "../hooks/useQuotations";
import type { QuotationStatus } from "../api/quotations";
import { formatMoney, formatDate } from "../utils/format";
import { Modal } from "../components/ui/Modal";
import { DemoGuard } from "../components/DemoGuard";
import { useStoreProfile } from "../hooks/useStoreProfile";

const STATUS_OPTIONS: QuotationStatus[] = ["draft", "sent", "accepted", "declined"];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  declined: "bg-danger-light text-danger",
};

export function QuotationDetailPage() {
  const { id } = useParams();
  const quotationId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const { data: quotation, isLoading } = useQuotation(quotationId);
  const { data: store } = useStoreProfile();
  const deleteQuotation = useDeleteQuotation();
  const convertToInvoice = useConvertQuotationToInvoice();
  const updateQuotation = useUpdateQuotation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTerms, setShowTerms] = useState(true);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  if (isLoading || !quotation) {
    return <div className="h-96 animate-pulse rounded-xl bg-slate-100" />;
  }

  const isConverted = !!quotation.converted_invoice_id;

  const handleDelete = () => {
    if (!quotationId) return;
    setShowDeleteConfirm(false);
    deleteQuotation.mutate(quotationId, {
      onSuccess: () => {
        navigate("/quotations");
      },
    });
  };

  const handleStatusChange = (status: QuotationStatus) => {
    if (!quotationId) return;
    updateQuotation.mutate(
      { id: quotationId, payload: { status } },
      { onSuccess: () => setShowStatusDropdown(false) }
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/quotations" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink-900 transition-colors">
          <ArrowLeft size={16} /> Back to quotations
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {!isConverted && (
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown((v) => !v)}
                disabled={updateQuotation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-60"
              >
                <span>Change Status</span>
                <ChevronDown size={14} />
              </button>
              {showStatusDropdown && (
                <div className="absolute left-0 mt-1.5 w-36 rounded-lg border border-slate-100 bg-white p-1 shadow-lg z-20">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={st === quotation.status}
                      className="w-full rounded-md px-3 py-1.5 text-left text-xs font-semibold capitalize text-slate-700 hover:bg-slate-50 hover:text-ink-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {isConverted ? (
            <Link
              to={`/sales/${quotation.converted_invoice_id}`}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <FileOutput size={15} /> View Invoice
            </Link>
          ) : quotation.status === "accepted" ? (
            <button
              onClick={() => quotationId && convertToInvoice.mutate(quotationId)}
              disabled={convertToInvoice.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-60"
            >
              <FileOutput size={15} /> {convertToInvoice.isPending ? "Converting…" : "Convert to Invoice"}
            </button>
          ) : null}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Printer size={15} /> Print
          </button>
          {!isConverted && (
            <DemoGuard>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg border border-danger-light bg-danger-light/50 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-light transition-colors shadow-sm"
              >
                <Trash2 size={15} /> Delete
              </button>
            </DemoGuard>
          )}
        </div>
      </div>

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
                <span className="text-sm font-bold tracking-tight text-ink-900">{store?.company_name || "Quotation"}</span>
                {store?.gstin && <p className="text-[11px] text-slate-400">GSTIN: {store.gstin}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">#{quotation.quotation_number}</h1>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  quotation.converted_invoice_id ? "bg-emerald-100 text-emerald-700" : STATUS_STYLES[quotation.status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {quotation.converted_invoice_id ? "Converted" : quotation.status}
              </span>
            </div>
          </div>
          <div className="text-sm text-slate-500 sm:text-right space-y-1">
            <div className="flex items-center gap-1.5 sm:justify-end">
              <Calendar size={13} className="text-slate-400" />
              <span>Issued: {formatDate(quotation.issue_date)}</span>
            </div>
            {quotation.expiry_date && <p className="font-medium text-amber-600">Expires: {formatDate(quotation.expiry_date)}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</p>
            <p className="mt-2 text-base font-bold text-ink-900">{quotation.customer?.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Warehouse</p>
            <p className="mt-2 text-base font-bold text-ink-900">{quotation.warehouse?.name ?? "—"}</p>
            {quotation.warehouse?.location && (
              <p className="text-sm text-slate-500">{quotation.warehouse.location}</p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Tax Rate</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items?.map((item, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-3 font-medium text-ink-700">{item.description}</td>
                  <td className="figures py-3 px-3 text-right text-slate-500">{item.quantity}</td>
                  <td className="figures py-3 px-3 text-right text-slate-500">{formatMoney(item.unit_price)}</td>
                  <td className="figures py-3 px-3 text-right text-slate-400">{item.tax_rate}%</td>
                  <td className="figures py-3 px-3 text-right font-semibold text-ink-900">{formatMoney(item.line_total ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-4 w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="figures font-medium">{formatMoney(quotation.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax</span>
            <span className="figures font-medium">{formatMoney(quotation.tax_total)}</span>
          </div>
          {quotation.discount_total > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Discount</span>
              <span className="figures">-{formatMoney(quotation.discount_total)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2.5 text-base font-bold text-ink-900">
            <span>Total</span>
            <span className="figures text-lg">{formatMoney(quotation.grand_total)}</span>
          </div>
        </div>

        {/* Terms & Conditions Section */}
        {quotation.terms_conditions && (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-slate-100 px-2 py-2 rounded-lg transition-colors"
              onClick={() => setShowTerms(!showTerms)}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Terms & Conditions
                </p>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                {showTerms ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            {showTerms && (
              <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">
                  {quotation.terms_conditions}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes Section */}
        {quotation.notes && (
          <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</p>
            <p className="whitespace-pre-line leading-relaxed">{quotation.notes}</p>
          </div>
        )}

        {store?.show_signature && store?.signature && (
          <div className="mt-8 flex justify-end">
            <div className="text-center">
              <img src={store.signature} alt="Signature" className="mx-auto h-16 max-w-[180px] object-contain" />
              <p className="mt-1 border-t border-slate-300 pt-1 text-xs text-slate-500">Authorized Signatory</p>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete quotation">
        <div className="space-y-4">
          <p>Are you sure you want to delete this quotation? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={handleDelete} className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger-dark">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}