import type { InvoiceStatus } from "../../types";
import { useTranslation } from "../../context/LanguageContext";

const STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  pending: "bg-warn-light text-warn ring-amber-200",
  paid: "bg-success-light text-success ring-emerald-200",
  overdue: "bg-danger-light text-danger ring-red-200",
  cancelled: "bg-slate-100 text-slate-400 line-through ring-slate-200",
};

const DOT_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-slate-400",
  pending: "bg-warn",
  paid: "bg-success",
  overdue: "bg-danger",
  cancelled: "bg-slate-400",
};

const LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOT_STYLES[status]}`} />
      {t(LABELS[status])}
    </span>
  );
}
