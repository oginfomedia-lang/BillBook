// src/pages/accounts/AccountsListPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { listAccounts, deleteAccount } from "../../api/accounts";
import { formatMoney } from "../../utils/format";
import { ExportToolbar, type ColumnDef } from "../../components/ui/ExportToolbar";
import { DemoGuard } from "../../components/DemoGuard";

const ACCOUNT_COLUMNS: ColumnDef[] = [
  { key: "account_code", label: "Account Number", visible: true },
  { key: "account_name", label: "Account Name", visible: true },
  { key: "parent_account_name", label: "Parent Account", visible: true },
  { key: "current_balance", label: "Balance", visible: true },
  { key: "creator_name", label: "Created By", visible: true },
];


export function AccountsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", { page, perPage, search }],
    queryFn: () => listAccounts({ page, per_page: perPage, search }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success("Account deleted");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: () => toast.error("Failed to delete account"),
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete account "${name}"? Children will be moved to its parent.`)) {
      deleteMutation.mutate(id);
    }
  };

  const accounts = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const [columns, setColumns] = useState<ColumnDef[]>(ACCOUNT_COLUMNS);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Accounts List</h1>
          <p className="text-xs text-slate-400">View / Search Accounts</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="cursor-pointer hover:text-[#1e6fa8]" onClick={() => navigate("/dashboard")}>
            Home
          </span>
          <ChevronRight size={11} />
          <span className="text-slate-600 font-medium">Accounts List</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Show</label>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <label className="text-xs text-slate-500">entries</label>
        </div>

        <button
          onClick={() => navigate("/accounts/add")}
          className="flex items-center gap-1.5 rounded-lg bg-[#1e6fa8] px-4 py-2 text-xs font-bold text-white hover:bg-[#1a5f90] transition-colors shadow"
        >
          <Plus size={14} /> Create Account
        </button>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        {/* Export + Search row */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <ExportToolbar
            data={accounts.map((a: any) => ({
              account_code: a.account_code ?? "",
              account_name: a.account_name ?? "",
              parent_account_name: a.parent_account_name ?? "—",
              current_balance: a.current_balance ?? 0,
              creator_name: a.creator_name ?? "—",
            }))}
            columns={columns}
            onColumnsChange={setColumns}
            filename="accounts-list"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Search:</label>
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
                onBlur={() => { setSearch(searchInput); setPage(1); }}
                placeholder="Search…"
                className="rounded border border-slate-300 pl-7 pr-3 py-1 text-xs focus:border-[#1e6fa8] focus:outline-none w-44"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1e6fa8] text-left text-xs font-semibold text-white">
                <th className="px-4 py-3">Account Number</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Parent Account Name</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Created by</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-slate-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    No data available in table
                  </td>
                </tr>
              ) : (
                accounts.map((acct) => (
                  <tr key={acct.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1e6fa8]">
                      {acct.account_code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{acct.account_name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {acct.parent_account_name || <span className="text-slate-300 italic text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatMoney(acct.current_balance)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{acct.creator_name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/accounts/${acct.id}/edit`)}
                          className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#1e6fa8] transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <DemoGuard>
                          <button
                            onClick={() => handleDelete(acct.id, acct.account_name)}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </DemoGuard>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {accounts.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, total)} of {total} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={12} /> Previous
            </button>
            <span className="rounded border border-[#1e6fa8] bg-[#1e6fa8] px-3 py-1 text-xs font-bold text-white">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="flex items-center gap-1 rounded border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
