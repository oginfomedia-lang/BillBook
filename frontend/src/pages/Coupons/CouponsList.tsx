import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, Copy } from "lucide-react";
import { useCoupons, useDeleteCoupon } from "../../hooks/useCoupons";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { Modal } from "../../components/ui/Modal";
import { formatDate } from "../../utils/format";
import { useTranslation } from "../../context/LanguageContext";
import { useBranch } from "../../context/BranchContext";
import toast from "react-hot-toast";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Expired", value: "expired" },
];

export function CouponsListPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useCoupons({
    page,
    search,
    status: status || undefined,
    branch_id: currentBranchId || undefined,
  });
  const deleteCoupon = useDeleteCoupon();

  const handleDelete = (id: number, code: string) => {
    if (confirm(t(`Are you sure you want to delete coupon ${code}?`))) {
      deleteCoupon.mutate(id);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("Coupon code copied!"));
  };

  const getStatusBadge = (coupon: any) => {
    const status = coupon.status;
    const styles = {
      active: "bg-success-light text-success",
      inactive: "bg-slate-100 text-slate-500",
      expired: "bg-danger-light text-danger",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {t(status)}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Coupons")}</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} {t("total")}</p>
        </div>
        <Link
          to="/coupons/new"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={16} />
          {t("New Coupon")}
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("Search coupons by name or code…")}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                status === f.value ? "bg-ink-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[768px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("Code")}</th>
              <th className="px-4 py-3">{t("Name")}</th>
              <th className="px-4 py-3">{t("Type")}</th>
              <th className="px-4 py-3 text-right">{t("Value")}</th>
              <th className="px-4 py-3">{t("Expiry")}</th>
              <th className="px-4 py-3 text-center">{t("Uses")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
              <th className="px-4 py-3 text-center">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={8} />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No coupons found.")}
                </td>
              </tr>
            ) : (
              data?.items.map((coupon) => (
                <tr key={coupon.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-brand">{coupon.code}</span>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-900"
                        title={t("Copy code")}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900">{coupon.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {t(coupon.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">
                    {coupon.type === "percentage" ? `${coupon.value}%` : `₹${coupon.value}`}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{coupon.expiry_date ? formatDate(coupon.expiry_date) : t("Never")}</td>
                  <td className="px-4 py-3 text-center text-slate-500">
                    {coupon.max_uses > 0 ? `${coupon.used_count}/${coupon.max_uses}` : `${coupon.used_count} (∞)`}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(coupon)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        to={`/coupons/${coupon.id}/edit`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900 transition-colors"
                      >
                        <Edit2 size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(coupon.id, coupon.code)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-danger-light hover:text-danger transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
            onClick={() => setPage(p => p - 1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {t("Previous")}
          </button>
          <span className="text-sm text-slate-500">{t("Page")} {data.page} {t("of")} {data.pages}</span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {t("Next")}
          </button>
        </div>
      )}
    </div>
  );
}