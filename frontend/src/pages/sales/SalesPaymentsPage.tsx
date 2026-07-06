import { useState } from "react";
import { useInvoices, useRecordPayment } from "../../hooks/useInvoices";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { formatMoney, formatDate } from "../../utils/format";
import { useTranslation } from "../../context/LanguageContext";
import { useBranch } from "../../context/BranchContext";

export function SalesPaymentsPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useInvoices({
    page,
    search,
    status: "pending",
    branch_id: currentBranchId || undefined,
  });
  const recordPayment = useRecordPayment();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">{t("Sales Payments")}</h2>
        <p className="text-sm text-slate-500">{t("Collect payments for pending sales and keep the balance sheet up to date.")}</p>
      </div>

      <div className="relative max-w-md">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("Search pending sale…")}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("Invoice")}</th>
              <th className="px-4 py-3">{t("Customer")}</th>
              <th className="px-4 py-3">{t("Balance")}</th>
              <th className="px-4 py-3">{t("Due Date")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No pending payments found.")}
                </td>
              </tr>
            ) : (
              data?.items.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-ink-900">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-ink-700">{invoice.customer?.name}</td>
                  <td className="figures px-4 py-3 text-right font-semibold text-ink-900">
                    {formatMoney(invoice.balance_due)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(invoice.due_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => recordPayment.mutate({ id: invoice.id, amount: invoice.balance_due })}
                      disabled={recordPayment.isPending}
                      className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                    >
                      {recordPayment.isPending ? t("Working…") : t("Mark paid")}
                    </button>
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