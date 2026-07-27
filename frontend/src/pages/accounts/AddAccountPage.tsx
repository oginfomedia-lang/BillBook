// src/pages/accounts/AddAccountPage.tsx

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import {
  createAccount,
  updateAccount,
  getAccount,
  getAllAccounts,
  getNextAccountCode,
  type Account,
} from "../../api/accounts";

interface Props {
  editMode?: boolean;
}

export function AddAccountPage({ editMode = false }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const accountId = id ? parseInt(id) : null;

  // Form state
  const [parentId, setParentId] = useState<number | "">("");
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [note, setNote] = useState("");

  // Reference data
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);

  // Load all accounts for parent dropdown + next account code
  useEffect(() => {
    getAllAccounts()
      .then((accounts) => setAllAccounts(accounts.filter((a) => a.id !== accountId)))
      .catch((err) => console.error("Failed to load accounts", err));

    if (!editMode) {
      getNextAccountCode()
        .then((code) => setAccountCode(code))
        .catch((err) => console.error("Failed to fetch next code", err));
    }
  }, [editMode, accountId]);

  // Load existing account data in edit mode
  useEffect(() => {
    if (editMode && accountId) {
      setLoading(true);
      getAccount(accountId)
        .then((acct) => {
          setParentId(acct.parent_id ?? "");
          setAccountCode(acct.account_code);
          setAccountName(acct.account_name);
          setOpeningBalance(acct.opening_balance);
          setNote(acct.note ?? "");
        })
        .catch(() => toast.error("Failed to load account"))
        .finally(() => setLoading(false));
    }
  }, [editMode, accountId]);

  const handleSave = async () => {
    if (!accountName.trim()) {
      toast.error("Account Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        account_name: accountName.trim(),
        parent_id: parentId !== "" ? Number(parentId) : null,
        opening_balance: openingBalance,
        note: note.trim() || null,
      };

      if (editMode && accountId) {
        await updateAccount(accountId, payload);
        toast.success("Account updated successfully!");
      } else {
        await createAccount(payload);
        toast.success("Account created successfully!");
      }
      navigate("/accounts/list");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e6fa8] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-[#1e6fa8]" onClick={() => navigate("/dashboard")}>
          Home
        </span>
        <ChevronRight size={12} />
        <span
          className="cursor-pointer hover:text-[#1e6fa8]"
          onClick={() => navigate("/accounts/list")}
        >
          Accounts List
        </span>
        <ChevronRight size={12} />
        <span className="font-medium text-slate-700">Accounts</span>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Accounts</h1>
          <p className="text-xs text-slate-400">Add / Update Accounts</p>
        </div>
        {/* Breadcrumb pills (right side like screenshot) */}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="cursor-pointer hover:text-[#1e6fa8]" onClick={() => navigate("/dashboard")}>
            Home
          </span>
          <ChevronRight size={11} />
          <span
            className="cursor-pointer hover:text-[#1e6fa8]"
            onClick={() => navigate("/accounts/list")}
          >
            Accounts List
          </span>
          <ChevronRight size={11} />
          <span className="text-slate-600 font-medium">Accounts</span>
        </div>
      </div>

      {/* Alert (validation hint) */}
      {!accountName && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          Please Enter Valid Data
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
          {/* Left column */}
          <div className="space-y-5">
            {/* Parent Account */}
            <div className="flex items-center gap-4">
              <label className="w-40 flex-shrink-0 text-sm font-semibold text-slate-700">
                Parent Account <span className="text-red-500">*</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value === "" ? "" : Number(e.target.value))}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
              >
                <option value="">-CREATE ACCOUNT HEAD-</option>
                {allAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_code} — {a.account_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div className="flex items-center gap-4">
              <label className="w-40 flex-shrink-0 text-sm font-semibold text-slate-700">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="AC0001"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
              />
            </div>

            {/* Account Name */}
            <div className="flex items-center gap-4">
              <label className="w-40 flex-shrink-0 text-sm font-semibold text-slate-700">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter account name"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
              />
            </div>

            {/* ✅ OPENING BALANCE - Fixed leading zero */}
            <div className="flex items-center gap-4">
              <label className="w-40 flex-shrink-0 text-sm font-semibold text-slate-700">
                Opening Balance <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance === 0 ? '' : openingBalance}
                onChange={(e) => {
                  const val = e.target.value;
                  const cleanVal = val.replace(/^0+/, '');
                  if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
                    setOpeningBalance(cleanVal === '' ? 0 : parseFloat(cleanVal));
                  }
                }}
                onBlur={() => {
                  if (!openingBalance) {
                    setOpeningBalance(0);
                  }
                }}
                placeholder="0.00"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
              />
            </div>
          </div>

          {/* Right column — Note */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
              placeholder="Additional notes…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-w-36 rounded-lg bg-emerald-500 px-8 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/accounts/list")}
            className="min-w-36 rounded-lg bg-amber-500 px-8 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}