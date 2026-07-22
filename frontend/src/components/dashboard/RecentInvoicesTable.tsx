import { Link } from "react-router-dom";
import type { Invoice } from "../../types";
import { StatusBadge } from "../ui/StatusBadge";
import { formatMoney, formatDate } from "../../utils/format";
import { useTranslation } from "../../context/LanguageContext";

interface RecentInvoicesTableProps {
  invoices: Invoice[];
  isLoading?: boolean;
}

export function RecentInvoicesTable({ invoices, isLoading }: RecentInvoicesTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        {t("No invoices yet. Create your first invoice.")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {["Sl.No", "Date", "Invoice ID", "Customer", "Total", "Status", "Created By"].map(
              (h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {t(h)}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, idx) => (
            <tr
              key={inv.id}
              className={`border-b border-slate-50 transition-colors hover:bg-slate-50 ${
                idx % 2 === 1 ? "bg-slate-50/40" : ""
              }`}
            >
              <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                {inv.issue_date ? formatDate(inv.issue_date) : "—"}
              </td>
              <td className="px-4 py-2.5">
                <Link
                  to={`/sales/${inv.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {inv.invoice_number}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-slate-700">
                {inv.customer?.name ?? "—"}
              </td>
              <td className="figures whitespace-nowrap px-4 py-2.5 font-medium text-ink-900">
                {formatMoney(inv.grand_total)}
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={inv.status} />
              </td>
              <td className="px-4 py-2.5 text-slate-500">
                {/* Created-by user not in Invoice model — show "—" for now */}
                —
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
