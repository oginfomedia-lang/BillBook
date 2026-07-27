import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useInvoices } from "../../hooks/useInvoices";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { ExportToolbar, type ColumnDef } from "../../components/ui/ExportToolbar";
import { formatMoney, formatDate } from "../../utils/format";
import type { InvoiceStatus } from "../../types";
import { useTranslation } from "../../context/LanguageContext";
import { useBranch } from "../../context/BranchContext";

const STATUS_FILTERS: { label: string; value: InvoiceStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
];

const SALES_COLUMNS: ColumnDef[] = [
  { key: "invoice_number", label: "Invoice", visible: true },
  { key: "customer", label: "Customer", visible: true },
  { key: "issue_date", label: "Date", visible: true },
  { key: "grand_total", label: "Amount", visible: true },
  { key: "status", label: "Status", visible: true },
];

export function SalesListPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [columns, setColumns] = useState<ColumnDef[]>(SALES_COLUMNS);

  const { data, isLoading } = useInvoices({
    page,
    search,
    status: status || undefined,
    branch_id: currentBranchId || undefined, // 👈 Branch filter
  });

  const translatedFilters = STATUS_FILTERS.map((f) => ({
    ...f,
    label: t(f.label),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("Sales List")}</h2>
          <p className="text-sm text-slate-500">{t("Browse all sales invoices and review their status.")}</p>
        </div>
        <Link
          to="/sales/add"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={16} />
          {t("Add Sale")}
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("Search sales invoice number…")}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {translatedFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                status === filter.value
                  ? "bg-ink-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{data?.total ?? 0} {t("records")}</span>
        <ExportToolbar
          data={(data?.items ?? []).map((inv) => ({
            invoice_number: inv.invoice_number,
            customer: inv.customer?.name ?? "",
            issue_date: formatDate(inv.issue_date),
            grand_total: inv.grand_total,
            status: inv.status,
          }))}
          columns={columns}
          onColumnsChange={setColumns}
          filename="sales-list"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("Invoice")}</th>
              <th className="px-4 py-3">{t("Customer")}</th>
              <th className="px-4 py-3">{t("Date")}</th>
              <th className="px-4 py-3 text-right">{t("Amount")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No sales match this filter.")}
                </td>
              </tr>
            ) : (
              data?.items.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/sales/${invoice.id}`} className="font-medium text-brand hover:underline">
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{invoice.customer?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(invoice.issue_date)}</td>
                  <td className="figures px-4 py-3 text-right font-medium text-ink-900">
                    {formatMoney(invoice.grand_total)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {t("Previous")}
          </button>
          <span className="text-sm text-slate-500">
            {t("Page")} {data.page} {t("of")} {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {t("Next")}
          </button>
        </div>
      )}
    </div>
  );
}