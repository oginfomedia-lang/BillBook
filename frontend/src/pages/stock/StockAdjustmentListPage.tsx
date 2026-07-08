import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Eye,
  X,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAdjustments, useCreateAdjustment, useUpdateAdjustment, useDeleteAdjustment } from "../../hooks/useStock";
import { useWarehouses } from "../../hooks/useWarehouses";
import { useItems } from "../../hooks/useItems";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { formatDate } from "../../utils/format";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AdjLineItem {
  item_id: number;
  item_name: string;
  quantity: number;
  unit_cost: number | null;
}

interface ModalState {
  open: boolean;
  mode: "create" | "edit" | "view";
  id: number | null;
  reference_no: string;
  adjustment_date: string;
  warehouse_id: string;
  adjustment_type: "addition" | "subtraction";
  notes: string;
  lines: AdjLineItem[];
}

const emptyModal = (): ModalState => ({
  open: false,
  mode: "create",
  id: null,
  reference_no: "",
  adjustment_date: new Date().toISOString().slice(0, 10),
  warehouse_id: "",
  adjustment_type: "addition",
  notes: "",
  lines: [],
});

// ─── Main Page ─────────────────────────────────────────────────────────────

export function StockAdjustmentListPage() {
  const navigate = useNavigate();

  // Filters / pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState<number | undefined>(undefined);

  const { data, isLoading, isFetching } = useAdjustments({
    page,
    per_page: 15,
    search: search || undefined,
    warehouse_id: filterWarehouse,
  });

  const { data: warehouseData } = useWarehouses({ per_page: 100 });
  const warehouses = warehouseData?.items ?? [];

  const { data: itemsData } = useItems({ per_page: 200 });
  const items = itemsData?.items ?? [];

  const createAdj = useCreateAdjustment();
  const updateAdj = useUpdateAdjustment();
  const deleteAdj = useDeleteAdjustment();

  const [modal, setModal] = useState<ModalState>(emptyModal());

  const adjustments = data?.adjustments ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setModal({ ...emptyModal(), open: true, mode: "create" });
  };

  const openEdit = async (adj: any) => {
    setModal({
      open: true,
      mode: "edit",
      id: adj.id,
      reference_no: adj.reference_no || "",
      adjustment_date: adj.adjustment_date || new Date().toISOString().slice(0, 10),
      warehouse_id: adj.warehouse_id ? String(adj.warehouse_id) : "",
      adjustment_type: adj.adjustment_type || "addition",
      notes: adj.notes || "",
      lines: (adj.items || []).map((i: any) => ({
        item_id: i.item_id,
        item_name: i.item_name || "",
        quantity: Number(i.quantity), // Convert to number to remove leading zeros
        unit_cost: i.unit_cost ?? null,
      })),
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this adjustment?")) return;
    try {
      await deleteAdj.mutateAsync(id);
      toast.success("Adjustment deleted successfully.");
    } catch {
      toast.error("Failed to delete adjustment.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.warehouse_id) {
      toast.error("Please select a warehouse.");
      return;
    }
    if (modal.lines.length === 0) {
      toast.error("Add at least one item to the adjustment.");
      return;
    }

    const payload = {
      reference_no: modal.reference_no || undefined,
      adjustment_date: modal.adjustment_date,
      warehouse_id: modal.warehouse_id ? Number(modal.warehouse_id) : null,
      adjustment_type: modal.adjustment_type,
      notes: modal.notes || undefined,
      items: modal.lines.map((l) => ({
        item_id: l.item_id,
        quantity: Number(l.quantity), // Ensure quantity is a number
        unit_cost: l.unit_cost ?? undefined,
      })),
    };

    try {
      if (modal.mode === "create") {
        await createAdj.mutateAsync(payload);
        toast.success("Stock adjustment created!");
      } else {
        await updateAdj.mutateAsync({ id: modal.id!, payload });
        toast.success("Stock adjustment updated!");
      }
      setModal(emptyModal());
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save adjustment.");
    }
  };

  // ── Line Items helpers ─────────────────────────────────────────────────────

  const addLine = () => {
    if (items.length === 0) return;
    const first = items[0];
    setModal((m) => ({
      ...m,
      lines: [
        ...m.lines,
        { item_id: first.id, item_name: first.item_name, quantity: 1, unit_cost: null },
      ],
    }));
  };

  const updateLine = (idx: number, field: keyof AdjLineItem, value: any) => {
    setModal((m) => {
      const lines = [...m.lines];
      if (field === "item_id") {
        const found = items.find((i) => i.id === Number(value));
        lines[idx] = {
          ...lines[idx],
          item_id: Number(value),
          item_name: found?.item_name || "",
        };
      } else if (field === "quantity") {
        // Ensure quantity is stored as a number, remove leading zeros
        const numValue = Number(value);
        lines[idx] = { ...lines[idx], quantity: isNaN(numValue) ? 0 : numValue };
      } else {
        lines[idx] = { ...lines[idx], [field]: value };
      }
      return { ...m, lines };
    });
  };

  const removeLine = (idx: number) => {
    setModal((m) => ({ ...m, lines: m.lines.filter((_, i) => i !== idx) }));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900 flex items-center gap-2">
            <ClipboardList size={22} className="text-brand" />
            Stock Adjustment List
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} record{total !== 1 ? "s" : ""} found</p>
        </div>
        <button
          id="new-stock-adjustment-btn"
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Stock Adjustment
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            id="adj-search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by reference no…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <select
          id="adj-warehouse-filter"
          value={filterWarehouse ?? ""}
          onChange={(e) => { setFilterWarehouse(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">— All Warehouses —</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" className="rounded border-slate-300" />
              </th>
              <th className="px-4 py-3">Adjustment Date</th>
              <th className="px-4 py-3">Reference No.</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching ? (
              <TableSkeleton rows={6} cols={8} />
            ) : adjustments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                  No stock adjustments found. Click &quot;New Stock Adjustment&quot; to create one.
                </td>
              </tr>
            ) : (
              adjustments.map((adj) => (
                <tr key={adj.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {adj.adjustment_date ? formatDate(adj.adjustment_date) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{adj.reference_no || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{adj.warehouse?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${adj.adjustment_type === "addition"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                      }`}>
                      {adj.adjustment_type === "addition" ? "+ Addition" : "- Subtraction"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {Number(adj.item_count)} item{Number(adj.item_count) !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{adj.created_by || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(adj)}
                        className="rounded p-1.5 text-slate-400 hover:bg-brand/10 hover:text-brand transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(adj.id)}
                        className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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

      {/* ── Pagination ── */}
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

      {/* ── Modal ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-100 my-8"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-base font-bold text-slate-800">
                {modal.mode === "create" ? "New Stock Adjustment" : "Edit Stock Adjustment"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(emptyModal())}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Reference No.
                </label>
                <input
                  type="text"
                  value={modal.reference_no}
                  onChange={(e) => setModal((m) => ({ ...m, reference_no: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="e.g. ADJ-001"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Adjustment Date *
                </label>
                <input
                  type="date"
                  required
                  value={modal.adjustment_date}
                  onChange={(e) => setModal((m) => ({ ...m, adjustment_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Warehouse *
                </label>
                <select
                  required
                  value={modal.warehouse_id}
                  onChange={(e) => setModal((m) => ({ ...m, warehouse_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">— Select Warehouse —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Adjustment Type *
                </label>
                <select
                  required
                  value={modal.adjustment_type}
                  onChange={(e) => setModal((m) => ({ ...m, adjustment_type: e.target.value as any }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="addition">Addition (Stock In)</option>
                  <option value="subtraction">Subtraction (Stock Out)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={modal.notes}
                  onChange={(e) => setModal((m) => ({ ...m, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  placeholder="Optional notes…"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Items
                </span>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-1 rounded-lg bg-brand/10 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors"
                >
                  <Plus size={12} /> Add Item
                </button>
              </div>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Item</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 w-24">Qty</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 w-28">Unit Cost</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {modal.lines.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                          No items added yet.
                        </td>
                      </tr>
                    ) : (
                      modal.lines.map((line, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2">
                            <select
                              value={line.item_id}
                              onChange={(e) => updateLine(idx, "item_id", e.target.value)}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                            >
                              {items.map((i) => (
                                <option key={i.id} value={i.id}>{i.item_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={line.quantity === 0 ? "" : line.quantity}
                              onChange={(e) => {
                                let val = e.target.value;
                                val = val.replace(/^0+(?=\d)/, '');
                                e.target.value = val;
                                updateLine(idx, "quantity", val === '' ? 0 : parseFloat(val) || 0);
                              }}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_cost ?? ""}
                              onChange={(e) => updateLine(idx, "unit_cost", e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                              placeholder="Optional"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
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
                disabled={createAdj.isPending || updateAdj.isPending}
                className="rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {(createAdj.isPending || updateAdj.isPending)
                  ? "Saving…"
                  : modal.mode === "create" ? "Create Adjustment" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}