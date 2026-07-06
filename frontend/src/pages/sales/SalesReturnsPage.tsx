import { useState } from "react";
import { useInvoices } from "../../hooks/useInvoices";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { formatMoney, formatDate } from "../../utils/format";
import { useTranslation } from "../../context/LanguageContext";
import { useBranch } from "../../context/BranchContext";

export function SalesReturnsPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useInvoices({
    page,
    search,
    status: "cancelled",
    branch_id: currentBranchId || undefined,
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">{t("Sales Returns List")}</h2>
        <p className="text-sm text-slate-500">{t("Review sales invoices that were cancelled or returned.")}</p>
      </div>

      <div className="relative max-w-md">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("Search returns…")}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">{t("Invoice")}</th>
              <th className="px-4 py-3">{t("Customer")}</th>
              <th className="px-4 py-3">{t("Amount")}</th>
              <th className="px-4 py-3">{t("Date")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={6} cols={4} />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No returns or cancelled sales recorded yet.")}
                </td>
              </tr>
            ) : (
              data?.items.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-ink-900">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-ink-700">{invoice.customer?.name}</td>
                  <td className="figures px-4 py-3 text-right font-medium text-ink-900">{formatMoney(invoice.grand_total)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(invoice.issue_date)}</td>
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