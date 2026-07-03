import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useBranches, useDeleteBranch } from "../../hooks/useBranches";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { useTranslation } from "../../context/LanguageContext";

export function BranchesListPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useBranches({ page, search });
  const deleteBranch = useDeleteBranch();

  const handleDelete = (id: number) => {
    if (confirm(t("Are you sure you want to delete this branch?"))) {
      deleteBranch.mutate(id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Branches")}</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} {t("total")}</p>
        </div>
        <Link
          to="/branches/new"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={16} />
          {t("New Branch")}
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t("Search branches by name or code…")}
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("Code")}</th>
              <th className="px-4 py-3">{t("Name")}</th>
              <th className="px-4 py-3">{t("Phone")}</th>
              <th className="px-4 py-3">{t("Email")}</th>
              <th className="px-4 py-3 text-center">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No branches found.")}
                </td>
              </tr>
            ) : (
              data?.items.map((branch) => (
                <tr key={branch.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand">{branch.code}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{branch.name}</td>
                  <td className="px-4 py-3 text-slate-500">{branch.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{branch.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        to={`/branches/${branch.id}/edit`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900 transition-colors"
                      >
                        <Edit2 size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(branch.id)}
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