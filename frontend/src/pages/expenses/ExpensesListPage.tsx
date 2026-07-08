import { useState } from "react";
import { Plus, Search, Trash2, Edit2, X, ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import {
  useExpenses,
  useExpenseCategories,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "../../hooks/useExpenses";
import { useAccounts } from "../../hooks/useAccounts";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { formatDate } from "../../utils/format";
import toast from "react-hot-toast";
import { handleExport, type ExportFormat } from "../../utils/exportUtils";

interface ModalState {
  open: boolean;
  isEdit: boolean;
  id: number | null;
  expense_date: string;
  category_id: string;
  reference_no: string;
  expense_for: string;
  amount: string;
  account_id: string;
  notes: string;
}

const emptyModal = (): ModalState => ({
  open: false,
  isEdit: false,
  id: null,
  expense_date: new Date().toISOString().slice(0, 10),
  category_id: "",
  reference_no: "",
  expense_for: "",
  amount: "",
  account_id: "",
  notes: "",
});

export function ExpensesListPage() {
  // ✅ FIXED: Added 'page' state
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);  // ✅ ADD THIS LINE
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { data, isLoading, isFetching } = useExpenses({
    page,  // ✅ Now defined
    per_page: perPage,
    search: search || undefined,
    category_id: categoryFilter ? Number(categoryFilter) : undefined,
  });

  const { data: categoryData = [] } = useExpenseCategories();
  const { data: accountsData } = useAccounts({ per_page: 100 });
  const accounts = accountsData?.items ?? [];

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [modal, setModal] = useState<ModalState>(emptyModal());

  const expenses = data?.expenses ?? [];
  const total = data?.total ?? 0;
  const totalAmount = data?.total_amount ?? 0;
  const pages = data?.pages ?? 1;

  const handleOpenCreate = () => {
    setModal({ ...emptyModal(), open: true });
  };

  const exportColumns = [
    { header: "Date", key: (row: any) => row.expense_date ? formatDate(row.expense_date) : "—" },
    { header: "Category", key: "category_name" },
    { header: "Reference No.", key: "reference_no" },
    { header: "Expense for", key: "expense_for" },
    { header: "Amount", key: (row: any) => row.amount ? Number(row.amount).toFixed(2) : "0.00" },
    { header: "Account", key: "account_name" },
    { header: "Note", key: "notes" },
    { header: "Created by", key: "created_by" },
  ];

  const doExport = (format: ExportFormat) => {
    handleExport(expenses, exportColumns, format, "Expenses");
  };

  const handleOpenEdit = (exp: any) => {
    setModal({
      open: true,
      isEdit: true,
      id: exp.id,
      expense_date: exp.expense_date || new Date().toISOString().slice(0, 10),
      category_id: exp.category_id ? String(exp.category_id) : "",
      reference_no: exp.reference_no || "",
      expense_for: exp.expense_for || "",
      amount: String(exp.amount),
      account_id: exp.account_id ? String(exp.account_id) : "",
      notes: exp.notes || "",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.category_id) {
      toast.error("Please select a category.");
      return;
    }
    const numAmount = Number(modal.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }

    const payload = {
      expense_date: modal.expense_date,
      category_id: Number(modal.category_id),
      reference_no: modal.reference_no || undefined,
      expense_for: modal.expense_for || undefined,
      amount: numAmount,
      account_id: modal.account_id ? Number(modal.account_id) : null,
      notes: modal.notes || undefined,
    };

    try {
      if (modal.isEdit && modal.id) {
        await updateExpense.mutateAsync({ id: modal.id, payload });
        toast.success("Expense updated successfully.");
      } else {
        await createExpense.mutateAsync(payload);
        toast.success("Expense created successfully.");
      }
      setModal(emptyModal());
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save expense.");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteExpense.mutateAsync(id);
        toast.success("Expense deleted successfully.");
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to delete expense.");
      }
    }
  };

  const handleAmountChange = (val: string) => {
    const cleaned = val.replace(/^0+(?=\d)/, "");
    setModal((m) => ({ ...m, amount: cleaned }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900 flex items-center gap-2">
            <TrendingDown size={22} className="text-rose-500" />
            Expenses List
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">View/Search Expenses</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors shadow-sm"
        >
          <Plus size={16} /> New Expense
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Show</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="rounded border border-slate-200 px-2 py-1 focus:outline-none"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span>entries</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">— All Categories —</option>
            {categoryData.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs text-slate-600">
            <button type="button" onClick={() => doExport("copy")} className="px-2.5 py-1 hover:bg-slate-50 rounded">Copy</button>
            <button type="button" onClick={() => doExport("excel")} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">Excel</button>
            <button type="button" onClick={() => doExport("pdf")} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">PDF</button>
            <button type="button" onClick={() => doExport("print")} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">Print</button>
            <button type="button" onClick={() => doExport("csv")} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">CSV</button>
            <button type="button" onClick={() => alert("Column visibility feature coming soon!")} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">Columns</button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search reference/notes…"
              className="rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand w-48"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 w-12">
                <input type="checkbox" className="rounded border-slate-300" />
              </th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Reference No.</th>
              <th className="px-4 py-3">Expense for</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching ? (
              <TableSkeleton rows={5} cols={10} />
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-400">
                  No data available in table
                </td>
              </tr>
            ) : (
              <>
                {expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {exp.expense_date ? formatDate(exp.expense_date) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-semibold">{exp.category_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{exp.reference_no || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{exp.expense_for || "—"}</td>
                    <td className="px-4 py-3 text-slate-900 font-bold">
                      {exp.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{exp.account_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{exp.notes || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{exp.created_by || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-slate-900 font-black">{totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Showing page {page} of {pages} ({total} total)</span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={13} /> Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800">
                {modal.isEdit ? "Edit Expense" : "New Expense"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(emptyModal())}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  required
                  value={modal.expense_date}
                  onChange={(e) => setModal({ ...modal, expense_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  required
                  value={modal.category_id}
                  onChange={(e) => setModal({ ...modal, category_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">— Select Category —</option>
                  {categoryData.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Reference No.
                </label>
                <input
                  type="text"
                  value={modal.reference_no}
                  onChange={(e) => setModal({ ...modal, reference_no: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="e.g. EXP-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Expense for
                </label>
                <input
                  type="text"
                  value={modal.expense_for}
                  onChange={(e) => setModal({ ...modal, expense_for: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="e.g. Electricity, Rent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={modal.amount === "0" ? "" : modal.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Account
                </label>
                <select
                  value={modal.account_id}
                  onChange={(e) => setModal({ ...modal, account_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">— Select Account —</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Note
                </label>
                <textarea
                  value={modal.notes}
                  onChange={(e) => setModal({ ...modal, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  rows={3}
                  placeholder="Optional details..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModal(emptyModal())}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
              >
                {modal.isEdit ? "Save Changes" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}