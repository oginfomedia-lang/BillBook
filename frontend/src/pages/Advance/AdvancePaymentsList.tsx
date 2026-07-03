import { useState } from "react";
import { Plus, Search, Copy, Download, Printer, Columns2 } from "lucide-react";
import { useAdvancePayments, useCreateAdvancePayment, useUpdateAdvancePayment, useDeleteAdvancePayment } from "../../hooks/useAdvancePayments";
import { useCustomers } from "../../hooks/useCustomers";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { AdvancePaymentForm } from "./AdvancePaymentForm";
import { formatMoney, formatDate } from "../../utils/format";
import type { AdvancePayment } from "../../types";
import { useTranslation } from "../../context/LanguageContext";
import { useBranch } from "../../context/BranchContext";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function copyToClipboard(rows: AdvancePayment[]) {
  const header = "ID,Date,Customer,Amount,Payment Type,Status";
  const body = rows.map(r =>
    `${r.advance_number},${formatDate(r.payment_date)},${r.customer?.name || ""},${r.amount},${r.payment_type},${r.status}`
  ).join("\n");
  navigator.clipboard.writeText(`${header}\n${body}`).then(() => alert("Copied to clipboard!"));
}

function downloadCSV(rows: AdvancePayment[], filename: string) {
  const header = "ID,Date,Customer,Amount,Payment Type,Status";
  const body = rows.map(r =>
    `${r.advance_number},"${formatDate(r.payment_date)}","${r.customer?.name || ""}",${r.amount},"${r.payment_type}","${r.status}"`
  ).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdvancePaymentsList() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdvancePayment | null>(null);

  const { data, isLoading } = useAdvancePayments({ 
    page, 
    per_page: perPage, 
    search,
    branch_id: currentBranchId || undefined,
  });
  const { data: customersData } = useCustomers({ page: 1, per_page: 1000 });
  const createAdvance = useCreateAdvancePayment();
  const updateAdvance = useUpdateAdvancePayment();
  const deleteAdvance = useDeleteAdvancePayment();

  const customers = customersData?.items || [];

  const handleCreateSubmit = (payload: any) => {
    // Ensure branch_id is included
    const finalPayload = {
      ...payload,
      branch_id: currentBranchId || undefined,
    };
    createAdvance.mutate(finalPayload, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleUpdateSubmit = (payload: any) => {
    if (!editing) return;
    const finalPayload = {
      ...payload,
      branch_id: currentBranchId || undefined,
    };
    updateAdvance.mutate(
      { id: editing.id, payload: finalPayload },
      { onSuccess: () => setEditing(null) }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm(t("Are you sure you want to delete this advance payment?"))) {
      deleteAdvance.mutate(id);
    }
  };

  const from = data ? (data.page - 1) * perPage + 1 : 0;
  const to = data ? Math.min(data.page * perPage, data.total) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Advance Payments List")}</h1>
          <p className="text-sm text-slate-500">{t("Track advance payments received from customers.")}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={16} />
          {t("New Advance Payment")}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-auto">
          <span>{t("Show")}</span>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span>{t("entries")}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => copyToClipboard(data?.items || [])}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-colors"
          >
            <Copy size={12} /> {t("Copy")}
          </button>
          <button
            onClick={() => downloadCSV(data?.items || [], "advance_payments.csv")}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-colors"
          >
            <Download size={12} /> {t("Excel")}
          </button>
          <button
            onClick={() => downloadCSV(data?.items || [], "advance_payments.csv")}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-colors"
          >
            <Download size={12} /> {t("CSV")}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-colors"
          >
            <Printer size={12} /> {t("Print")}
          </button>
          <button
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Columns2 size={12} /> {t("Columns")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t("Search by ID or customer…")}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("ID")}</th>
              <th className="px-4 py-3">{t("Date")}</th>
              <th className="px-4 py-3">{t("Customer Name")}</th>
              <th className="px-4 py-3 text-right">{t("Amount")}</th>
              <th className="px-4 py-3">{t("Payment Type")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
              <th className="w-24 px-4 py-3 text-center">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={7} />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No advance payments found.")}
                </td>
              </tr>
            ) : (
              data?.items.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/65">
                  <td className="px-4 py-3 font-medium text-brand">{payment.advance_number}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(payment.payment_date)}</td>
                  <td className="px-4 py-3 text-ink-700">{payment.customer?.name}</td>
                  <td className="figures px-4 py-3 text-right font-medium text-ink-900">{formatMoney(payment.amount)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {payment.payment_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        payment.status === "pending"
                          ? "bg-warn-light text-warn"
                          : payment.status === "applied"
                          ? "bg-success-light text-success"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {t(payment.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditing(payment)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900"
                        aria-label={t("Edit")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-danger-light hover:text-danger"
                        aria-label={t("Delete")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-slate-500">
            {t("Showing")} {from} {t("to")} {to} {t("of")} {data.total} {t("entries")}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50"
            >
              {t("Previous")}
            </button>
            <span className="text-slate-500">{t("Page")} {data.page} {t("of")} {data.pages}</span>
            <button
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50"
            >
              {t("Next")}
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <AdvancePaymentForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateSubmit}
        customers={customers}
        isSubmitting={createAdvance.isPending}
      />

      {/* Edit Modal */}
      {editing && (
        <AdvancePaymentForm
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdateSubmit}
          initialData={editing}
          customers={customers}
          isSubmitting={updateAdvance.isPending}
        />
      )}
    </div>
  );
}