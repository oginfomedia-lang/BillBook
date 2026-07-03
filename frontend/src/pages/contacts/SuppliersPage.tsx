// src/pages/contacts/SuppliersPage.tsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { formatMoney } from "../../utils/format";
import { useSuppliers, useDeleteSupplier } from "../../hooks/useSuppliers";
import { useTranslation } from "../../context/LanguageContext";

export function SuppliersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  
  const { data, isLoading } = useSuppliers({ page, search });
  const deleteSupplier = useDeleteSupplier();
  
  const suppliers = data?.items ?? [];

  const handleDelete = (id: number) => {
    if (confirm(t("Are you sure you want to remove this supplier?"))) {
      deleteSupplier.mutate(id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Suppliers")}</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} {t("total")}</p>
        </div>
        <Link
          to="/suppliers/new"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> {t("Add Supplier")}
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("Search suppliers by name…")}
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("Supplier Name")}</th>
              <th className="px-4 py-3">{t("Contact")}</th>
              <th className="px-4 py-3">{t("GST Number")}</th>
              <th className="px-4 py-3 text-right">{t("Opening Balance")}</th>
              <th className="w-24 px-4 py-3 text-center">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No suppliers found matching your search.")}
                </td>
              </tr>
            ) : (
              suppliers.map((supplier: any) => (
                <tr key={supplier.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/65 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{supplier.name}</p>
                    {supplier.address && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{supplier.address}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <p>{supplier.email || "—"}</p>
                    {supplier.phone && <p className="text-xs text-slate-400 mt-0.5">{supplier.phone}</p>}
                    {supplier.mobile && <p className="text-xs text-slate-400">{supplier.mobile}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{supplier.gst_number || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">
                    {formatMoney(supplier.opening_balance || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        to={`/suppliers/${supplier.id}/edit`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900 transition-colors"
                        aria-label={t("Edit supplier")}
                      >
                        <Edit2 size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                        aria-label={t("Delete supplier")}
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
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            {t("Previous")}
          </button>
          <span className="text-sm text-slate-500">
            {t("Page")} {data.page} {t("of")} {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            {t("Next")}
          </button>
        </div>
      )}
    </div>
  );
}