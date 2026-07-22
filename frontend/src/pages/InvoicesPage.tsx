import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useInvoices } from "../hooks/useInvoices";
import { StatusBadge } from "../components/ui/StatusBadge";
import { TableSkeleton } from "../components/ui/Skeletons";
import { formatMoney, formatDate } from "../utils/format";
import type { InvoiceStatus } from "../types";
import { useTranslation } from "../context/LanguageContext";
import { useBranch } from "../context/BranchContext";

const STATUS_FILTERS: { label: string; value: InvoiceStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

export function InvoicesPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "">("");

  const { data, isLoading } = useInvoices({
    page,
    search,
    status: status || undefined,
    branch_id: currentBranchId || undefined,
  });

  const translatedFilters = STATUS_FILTERS.map((f) => ({
    ...f,
    label: t(f.label),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Sales")}</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} {t("total")}</p>
        </div>
        <Link
          to="/invoices/new"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={16} />
          {t("New Sale")}
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
            placeholder={t("Search sales…")}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {translatedFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                status === f.value ? "bg-ink-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                  {t("No invoices match this filter.")}
                </td>
              </tr>
            ) : (
              data?.items.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/sales/${inv.id}`} className="font-medium text-brand hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{inv.customer?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(inv.issue_date)}</td>
                  <td className="figures px-4 py-3 text-right font-medium text-ink-900">
                    {formatMoney(inv.grand_total)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
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
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {t("Previous")}
          </button>
          <span className="text-sm text-slate-500">
            {t("Page")} {data.page} {t("of")} {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {t("Next")}
          </button>
        </div>
      )}
    </div>
  );
}