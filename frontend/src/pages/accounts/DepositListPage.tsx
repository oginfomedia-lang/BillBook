// src/pages/accounts/DepositListPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  listDeposits,
  createDeposit,
  deleteDeposit,
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

interface CreateDepositModalProps {
  accounts: Account[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function CreateDepositModal({ accounts, onClose, onSave }: CreateDepositModalProps) {
  const [debitAccountId, setDebitAccountId] = useState<number | "">("");
  const [creditAccountId, setCreditAccountId] = useState<number | "">("");
  const [amount, setAmount] = useState<number>(0);
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        debit_account_id: debitAccountId !== "" ? Number(debitAccountId) : null,
        credit_account_id: creditAccountId !== "" ? Number(creditAccountId) : null,
        amount,
        deposit_date: depositDate || null,
        reference_no: referenceNo || null,
        note: note || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">New Deposit</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Deposit Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Reference No.</label>
              <input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional reference"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Debit Account</label>
            <select
              value={debitAccountId}
              onChange={(e) => setDebitAccountId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
            >
              <option value="">Select</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Credit Account</label>
            <select
              value={creditAccountId}
              onChange={(e) => setCreditAccountId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
            >
              <option value="">Select</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional note…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:border-[#1e6fa8] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Deposit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function DepositListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDebit, setFilterDebit] = useState<number | "">("");
  const [filterCredit, setFilterCredit] = useState<number | "">("");
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["deposits", { page, perPage, search, filterDate, filterDebit, filterCredit }],
    queryFn: () => listDeposits({
      page,
      per_page: perPage,
      search,
      deposit_date: filterDate || undefined,
      debit_account_id: filterDebit !== "" ? Number(filterDebit) : undefined,
      credit_account_id: filterCredit !== "" ? Number(filterCredit) : undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const { data: accountsList } = useQuery({
    queryKey: ["accounts", "all"],
    queryFn: getAllAccounts,
  });

  const createMutation = useMutation({
    mutationFn: createDeposit,
    onSuccess: () => {
      toast.success("Deposit recorded!");
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || "Failed to record deposit"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeposit,
    onSuccess: () => {
      toast.success("Deposit deleted");
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const deposits = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const accounts = accountsList ?? [];

  const exportColumns = [
    { header: "Deposit Date", key: "deposit_date" },
    { header: "Reference No.", key: (row: any) => row.reference_no || "—" },
    { header: "Debit Account", key: "debit_account_name" },
    { header: "Credit Account", key: "credit_account_name" },
    { header: "Amount", key: "amount" },
    { header: "Created By", key: (row: any) => row.creator_name || "—" },
  ];

  const doExport = (format: ExportFormat) => {
    handleExport(deposits, exportColumns, format, "Deposits");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Deposit List</h1>
          <p className="text-xs text-slate-400">View / Search Accounts</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="cursor-pointer hover:text-[#1e6fa8]" onClick={() => navigate("/dashboard")}>Home</span>
          <ChevronRight size={11} />
          <span className="text-slate-600 font-medium">Deposit List</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Deposit Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Debit Account</label>
            <select
              value={filterDebit}
              onChange={(e) => { setFilterDebit(e.target.value === "" ? "" : Number(e.target.value)); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
            >
              <option value="">Select</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Credit Account</label>
            <select
              value={filterCredit}
              onChange={(e) => { setFilterCredit(e.target.value === "" ? "" : Number(e.target.value)); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
            >
              <option value="">Select</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Users</label>
            <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none">
              <option value="">All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Show + New Deposit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Show</label>
          <select className="rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none">
            <option>10</option>
          </select>
          <label className="text-xs text-slate-500">entries</label>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#1e6fa8] px-4 py-2 text-xs font-bold text-white hover:bg-[#1a5f90] transition-colors shadow"
        >
          <Plus size={14} /> New Deposit
        </button>
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
                <th className="px-4 py-3">Deposit Date</th>
                <th className="px-4 py-3">Reference No.</th>
                <th className="px-4 py-3">Debit Account</th>
                <th className="px-4 py-3">Credit Account</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Created by</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-slate-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    No data available in table
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(d.deposit_date ?? "")}</td>
                    <td className="px-4 py-3 text-slate-500">{d.reference_no || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{d.debit_account_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{d.credit_account_name || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatMoney(d.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{d.creator_name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => {
                            if (confirm("Delete this deposit? Account balances will be reversed."))
                              deleteMutation.mutate(d.id);
                          }}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {deposits.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
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

      {showModal && (
        <CreateDepositModal
          accounts={accounts}
          onClose={() => setShowModal(false)}
          onSave={async (data) => { await createMutation.mutateAsync(data); }}
        />
      )}
    </div>
  );
}
