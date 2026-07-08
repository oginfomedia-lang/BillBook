// src/pages/accounts/CashTransactionsPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  listCashTransactions,
  linkCashTransactionToAccount,
  getAllAccounts,
  type Account,
} from "../../api/accounts";
import { formatMoney, formatDate } from "../../utils/format";
import { handleExport, type ExportFormat } from "../../utils/exportUtils";

function ExportBtn({ label, color, onClick }: { label: string; color: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs font-semibold text-white rounded hover:opacity-80 ${color}`}>
      {label}
    </button>
  );
}

interface LinkAccountModalProps {
  accounts: Account[];
  onClose: () => void;
  onSave: (accountId: number) => Promise<void>;
  currentLinkedName?: string | null;
}

function LinkAccountModal({ accounts, onClose, onSave, currentLinkedName }: LinkAccountModalProps) {
  const [accountId, setAccountId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }
    setSaving(true);
    try {
      await onSave(Number(accountId));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">Link Account</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {currentLinkedName && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Currently linked to: <strong>{currentLinkedName}</strong>. Select a new account to change.
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Select Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
            >
              <option value="">-- Choose Account --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-[#1e6fa8] px-5 py-2 text-sm font-bold text-white hover:bg-[#1a5f90] disabled:opacity-50"
          >
            {saving ? "Linking…" : "Link Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function CashTransactionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedInvoiceLinkedName, setSelectedInvoiceLinkedName] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cash-transactions", { page, perPage, search, fromDate, toDate }],
    queryFn: () => listCashTransactions({
      page,
      per_page: perPage,
      search,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const { data: accountsList } = useQuery({
    queryKey: ["accounts", "all"],
    queryFn: getAllAccounts,
  });

  const linkMutation = useMutation({
    mutationFn: ({ invoiceId, accountId }: { invoiceId: number, accountId: number }) => 
      linkCashTransactionToAccount(invoiceId, accountId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || "Failed to link account"),
  });

  const transactions = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const accounts = accountsList ?? [];

  const exportColumns = [
    { header: "Date", key: "date" },
    { header: "Payment Code", key: "payment_code" },
    { header: "Payment Type", key: "payment_type" },
    { header: "Payment", key: "payment" },
    { header: "Note", key: (row: any) => row.note || "—" },
    { header: "Created By", key: (row: any) => row.creator_name || "—" },
    { header: "Account", key: (row: any) => row.linked_account_name || "—" },
  ];

  const doExport = (format: ExportFormat) => {
    handleExport(transactions, exportColumns, format, "CashTransactions");
  };

  const handleLinkClick = (id: number, currentName: string | null) => {
    setSelectedInvoiceId(id);
    setSelectedInvoiceLinkedName(currentName);
    setShowModal(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cash Transactions</h1>
          <p className="text-xs text-slate-400">View Cash Transactions</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="cursor-pointer hover:text-[#1e6fa8]" onClick={() => navigate("/dashboard")}>Home</span>
          <ChevronRight size={11} />
          <span className="cursor-pointer hover:text-[#1e6fa8]" onClick={() => navigate("/accounts/list")}>Accounts List</span>
          <ChevronRight size={11} />
          <span className="text-slate-600 font-medium">Cash Transactions</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Users</label>
            <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none">
              <option value="">All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Show entries */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Show</label>
        <select className="rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none">
          <option>10</option>
        </select>
        <label className="text-xs text-slate-500">entries</label>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <ExportBtn label="Copy" color="bg-slate-500" onClick={() => doExport("copy")} />
            <ExportBtn label="Excel" color="bg-emerald-600" onClick={() => doExport("excel")} />
            <ExportBtn label="PDF" color="bg-red-500" onClick={() => doExport("pdf")} />
            <ExportBtn label="Print" color="bg-slate-600" onClick={() => doExport("print")} />
            <ExportBtn label="CSV" color="bg-amber-500" onClick={() => doExport("csv")} />
            <ExportBtn label="Columns" color="bg-[#1e6fa8]" onClick={() => alert("Column selector coming soon!")} />
          </div>
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1e6fa8] text-left text-xs font-semibold text-white">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payment Code</th>
                <th className="px-4 py-3">Payment Type</th>
                <th className="px-4 py-3 text-right">Payment</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Created by</th>
                <th className="px-4 py-3 text-center">Account</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-slate-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    No data available in table
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(tx.date ?? "")}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{tx.payment_code}</td>
                    <td className="px-4 py-3 text-slate-500">{tx.payment_type}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatMoney(tx.payment)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{tx.note || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{tx.creator_name || "—"}</td>
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-700">
                      {tx.linked_account_name ? (
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {tx.linked_account_name}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleLinkClick(tx.id, tx.linked_account_name)}
                        className="rounded bg-[#1e6fa8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a5f90] transition-colors"
                      >
                        {tx.linked_account_id ? "Change Account" : "Link Account"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {transactions.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, total)} of {total} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={12} /> Previous
            </button>
            <span className="rounded border border-[#1e6fa8] bg-[#1e6fa8] px-3 py-1 font-bold text-white">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="flex items-center gap-1 rounded border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {showModal && selectedInvoiceId && (
        <LinkAccountModal
          accounts={accounts}
          currentLinkedName={selectedInvoiceLinkedName}
          onClose={() => {
            setShowModal(false);
            setSelectedInvoiceId(null);
            setSelectedInvoiceLinkedName(null);
          }}
          onSave={async (accountId) => { 
            await linkMutation.mutateAsync({ invoiceId: selectedInvoiceId, accountId }); 
          }}
        />
      )}
    </div>
  );
}
