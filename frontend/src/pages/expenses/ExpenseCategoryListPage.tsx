import { useState } from "react";
import { Plus, Search, Trash2, Edit2, X, ClipboardList } from "lucide-react";
import {
  useExpenseCategories,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
} from "../../hooks/useExpenses";
import { TableSkeleton } from "../../components/ui/Skeletons";
import toast from "react-hot-toast";
import { handleExport, type ExportFormat } from "../../utils/exportUtils";

interface ModalState {
  open: boolean;
  isEdit: boolean;
  id: number | null;
  name: string;
  description: string;
  status: "active" | "inactive";
}

const emptyModal = (): ModalState => ({
  open: false,
  isEdit: false,
  id: null,
  name: "",
  description: "",
  status: "active",
});

export function ExpenseCategoryListPage() {
  const { data: categories = [], isLoading } = useExpenseCategories();
  const createCat = useCreateExpenseCategory();
  const updateCat = useUpdateExpenseCategory();
  const deleteCat = useDeleteExpenseCategory();

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [modal, setModal] = useState<ModalState>(emptyModal());

  const exportColumns = [
    { header: "Category Name", key: "name" },
    { header: "Description", key: "description" },
    { header: "Status", key: "status" },
  ];

  const doExport = (format: ExportFormat) => {
    handleExport(filteredCategories, exportColumns, format, "ExpenseCategories");
  };

  const handleOpenCreate = () => {
    setModal({ ...emptyModal(), open: true });
  };

  const handleOpenEdit = (cat: any) => {
    setModal({
      open: true,
      isEdit: true,
      id: cat.id,
      name: cat.name,
      description: cat.description || "",
      status: cat.status || "active",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.name.trim()) return;

    try {
      if (modal.isEdit && modal.id) {
        await updateCat.mutateAsync({
          id: modal.id,
          payload: {
            name: modal.name,
            description: modal.description,
            status: modal.status,
          },
        });
        toast.success("Expense category updated.");
      } else {
        await createCat.mutateAsync({
          name: modal.name,
          description: modal.description,
          status: modal.status,
        });
        toast.success("Expense category created.");
      }
      setModal(emptyModal());
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save category.");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      try {
        await deleteCat.mutateAsync(id);
        toast.success("Expense category deleted.");
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to delete category.");
      }
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const displayedCategories = filteredCategories.slice(0, perPage);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 flex items-center gap-2">
            <ClipboardList size={22} className="text-brand" />
            Expense Category List
          </h1>
          <p className="text-sm text-slate-500">{filteredCategories.length} categories found</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors shadow-sm"
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        {/* Left Toolbar actions - show entries */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Show</span>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="rounded border border-slate-200 px-2 py-1 focus:outline-none"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span>entries</span>
        </div>

        {/* Right Toolbar Actions & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs text-slate-600">
            <button type="button" onClick={() => doExport("copy")} className="px-2.5 py-1 hover:bg-slate-50 rounded">Copy</button>
            <button type="button" onClick={() => doExport("excel")} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">Excel</button>
            <button type="button" onClick={() => doExport("pdf")} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">PDF</button>
            <button type="button" onClick={() => doExport("print")} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">Print</button>
            <button type="button" onClick={() => doExport("csv")} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">CSV</button>
            <button type="button" onClick={() => toast("Column visibility is coming soon!", { icon: "🛠️" })} className="px-2.5 py-1 hover:bg-slate-50 rounded border-l border-slate-100">Columns</button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand w-48"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 w-12">
                <input type="checkbox" className="rounded border-slate-300" />
              </th>
              <th className="px-4 py-3">Category Name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : displayedCategories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  No data available in table
                </td>
              </tr>
            ) : (
              displayedCategories.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{cat.name}</td>
                  <td className="px-4 py-3 text-slate-500">{cat.description || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        cat.status === "inactive"
                          ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      {cat.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Delete"
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

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800">
                {modal.isEdit ? "Edit Category" : "Create Category"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(emptyModal())}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={modal.name}
                  onChange={(e) => setModal({ ...modal, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="e.g. Office Supplies, Travel"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={modal.description}
                  onChange={(e) => setModal({ ...modal, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  rows={3}
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={modal.status}
                  onChange={(e) => setModal({ ...modal, status: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
