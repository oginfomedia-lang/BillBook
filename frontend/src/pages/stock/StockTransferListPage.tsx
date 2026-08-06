import { useState } from "react";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  X,
  ArrowRightLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTransfers, useCreateTransfer, useUpdateTransfer, useDeleteTransfer } from "../../hooks/useStock";
import { useWarehouses } from "../../hooks/useWarehouses";
import { useItems } from "../../hooks/useItems";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { formatDate } from "../../utils/format";
import { DemoGuard } from "../../components/DemoGuard";

// ─── Types ─────────────────────────────────────────────────────────────────

interface TransferLineItem {
  item_id: number;
  item_name: string;
  quantity: number;
}

interface ModalState {
  open: boolean;
  mode: "create" | "edit" | "view";
  id: number | null;
  transfer_date: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  notes: string;
  lines: TransferLineItem[];
}

const emptyModal = (): ModalState => ({
  open: false,
  mode: "create",
  id: null,
  transfer_date: new Date().toISOString().slice(0, 10),
  from_warehouse_id: "",
  to_warehouse_id: "",
  notes: "",
  lines: [],
});

// ─── Main Page ─────────────────────────────────────────────────────────────

export function StockTransferListPage() {
  // Filters / pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching } = useTransfers({
    page,
    per_page: 15,
    search: search || undefined,
  });

  const { data: warehouseData } = useWarehouses({ per_page: 100 });
  const warehouses = warehouseData?.items ?? [];

  const { data: itemsData } = useItems({ per_page: 200 });
  const items = itemsData?.items ?? [];

  const createTr = useCreateTransfer();
  const updateTr = useUpdateTransfer();
  const deleteTr = useDeleteTransfer();

  const [modal, setModal] = useState<ModalState>(emptyModal());

  const transfers = data?.transfers ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setModal({ ...emptyModal(), open: true, mode: "create" });
  };

  const openEdit = async (tr: any) => {
    setModal({
      open: true,
      mode: "edit",
      id: tr.id,
      transfer_date: tr.transfer_date || new Date().toISOString().slice(0, 10),
      from_warehouse_id: tr.from_warehouse_id ? String(tr.from_warehouse_id) : "",
      to_warehouse_id: tr.to_warehouse_id ? String(tr.to_warehouse_id) : "",
      notes: tr.notes || "",
      lines: (tr.items || []).map((i: any) => ({
        item_id: i.item_id,
        item_name: i.item_name || "",
        quantity: i.quantity,
      })),
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this transfer?")) return;
    try {
      await deleteTr.mutateAsync(id);
      toast.success("Transfer deleted successfully.");
    } catch {
      toast.error("Failed to delete transfer.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.from_warehouse_id || !modal.to_warehouse_id) {
      toast.error("Select both source and destination warehouses.");
      return;
    }
    if (modal.from_warehouse_id === modal.to_warehouse_id) {
      toast.error("From and To warehouses must be different.");
      return;
    }
    if (modal.lines.length === 0) {
      toast.error("Add at least one item to transfer.");
      return;
    }

    const payload = {
      transfer_date: modal.transfer_date,
      from_warehouse_id: Number(modal.from_warehouse_id),
      to_warehouse_id: Number(modal.to_warehouse_id),
      notes: modal.notes || undefined,
      items: modal.lines.map((l) => ({
        item_id: l.item_id,
        quantity: l.quantity,
      })),
    };

    try {
      if (modal.mode === "create") {
        await createTr.mutateAsync(payload);
        toast.success("Stock transfer created!");
      } else {
        await updateTr.mutateAsync({ id: modal.id!, payload });
        toast.success("Stock transfer updated!");
      }
      setModal(emptyModal());
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save transfer.");
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
        { item_id: first.id, item_name: first.item_name, quantity: 1 },
      ],
    }));
  };

  const updateLine = (idx: number, field: keyof TransferLineItem, value: any) => {
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
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 flex items-center gap-2">
            <ArrowRightLeft size={22} className="text-brand" />
            Stock Transfer List
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} record{total !== 1 ? "s" : ""} found</p>
        </div>
        <button
          id="new-transfer-btn"
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Transfer
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            id="transfer-search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search transfer notes…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" className="rounded border-slate-300" />
              </th>
              <th className="px-4 py-3">Transfer Date</th>
              <th className="px-4 py-3">From Warehouse</th>
              <th className="px-4 py-3">To Warehouse</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching ? (
              <TableSkeleton rows={6} cols={8} />
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                  No stock transfers found. Click &quot;New Transfer&quot; to create one.
                </td>
              </tr>
            ) : (
              transfers.map((tr) => (
                <tr key={tr.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {tr.transfer_date ? formatDate(tr.transfer_date) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{tr.from_warehouse || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{tr.to_warehouse || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 leading-relaxed">
                    <div>Items: {tr.item_count}</div>
                    <div>Quantity: {tr.total_quantity}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{tr.notes || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{tr.created_by || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(tr)}
                        className="rounded p-1.5 text-slate-400 hover:bg-brand/10 hover:text-brand transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <DemoGuard>
                        <button
                          onClick={() => handleDelete(tr.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
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
                {modal.mode === "create" ? "New Stock Transfer" : "Edit Stock Transfer"}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Transfer Date *
                </label>
                <input
                  type="date"
                  required
                  value={modal.transfer_date}
                  onChange={(e) => setModal((m) => ({ ...m, transfer_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  From Warehouse *
                </label>
                <select
                  required
                  value={modal.from_warehouse_id}
                  onChange={(e) => setModal((m) => ({ ...m, from_warehouse_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">— Select From —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  To Warehouse *
                </label>
                <select
                  required
                  value={modal.to_warehouse_id}
                  onChange={(e) => setModal((m) => ({ ...m, to_warehouse_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">— Select To —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={modal.notes}
                  onChange={(e) => setModal((m) => ({ ...m, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  placeholder="Optional notes or details…"
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
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 w-36">Quantity</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {modal.lines.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
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
                disabled={createTr.isPending || updateTr.isPending}
                className="rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {(createTr.isPending || updateTr.isPending)
                  ? "Saving…"
                  : modal.mode === "create" ? "Create Transfer" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
