// frontend/src/pages/WarehousesPage.tsx

import { useState } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useWarehouses } from "../hooks/useWarehouses";
import { useBranches } from "../hooks/useBranches";
import { TableSkeleton } from "../components/ui/Skeletons";  // ← FIXED: Capital 'S'
import { Modal } from "../components/ui/Modal";
import { DemoGuard } from "../components/DemoGuard";
import toast from "react-hot-toast";
import apiClient from "../api/client";  // ← FIXED: camelCase 'apiClient'

export function WarehousesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");  // ← FIXED: Added setSearch
  const [showForm, setShowForm] = useState(false);  // ← FIXED: Added
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);  // ← FIXED: Added
  const [isLoading, setIsLoading] = useState(false);  // ← FIXED: Separated from search

  const { data, isLoading: isLoadingData, refetch } = useWarehouses({ page, search });  // ← FIXED: Removed duplicate
  const warehouses = data?.items ?? [];

  const { data: branchData } = useBranches({ per_page: 100 });
  const branches = branchData?.items ?? [];

  const [form, setForm] = useState({
    name: "",
    location: "",
    branch_id: "" as number | "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Warehouse name is required");
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post("/warehouses", form);
      toast.success("Warehouse created successfully");
      setForm({ name: "", location: "", branch_id: "" });
      setShowForm(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to create warehouse");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (warehouse: any) => {
    setEditingWarehouse(warehouse);
    setForm({
      name: warehouse.name,
      location: warehouse.location || "",
      branch_id: warehouse.branch_id || "",
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    setIsLoading(true);
    try {
      await apiClient.put(`/warehouses/${editingWarehouse.id}`, form);
      toast.success("Warehouse updated successfully");
      setEditingWarehouse(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to update warehouse");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this warehouse?")) {
      return;
    }
    try {
      await apiClient.delete(`/warehouses/${id}`);
      toast.success("Warehouse deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete warehouse");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Warehouses</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} total warehouses</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Add Warehouse
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search warehouses by name..."
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Warehouse">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Warehouse Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Main Warehouse"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Mumbai, India"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Branch</label>
            <select
              value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value ? Number(e.target.value) : "" })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Defaults to your currently selected branch —</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Products stored in this warehouse only ever show up on this branch's dashboard/items list.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Warehouse"}
            </button>
          </div>
        </form>
      </Modal>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingData ? (
              <TableSkeleton rows={5} cols={4} />
            ) : warehouses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  No warehouses found. Create your first warehouse!
                </td>
              </tr>
            ) : (
              warehouses.map((warehouse: any) => (
                <tr key={warehouse.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-ink-900">{warehouse.name}</td>
                  <td className="px-4 py-3 text-slate-500">{warehouse.location || "—"}</td>
                  <td className="px-4 py-3">
                    {warehouse.branch_name ? (
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {warehouse.branch_name}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600">— no branch assigned —</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(warehouse)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900"
                      >
                        <Edit2 size={14} />
                      </button>
                      <DemoGuard>
                        <button
                          onClick={() => handleDelete(warehouse.id)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
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

      <Modal isOpen={editingWarehouse !== null} onClose={() => setEditingWarehouse(null)} title="Edit Warehouse">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Warehouse Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Branch</label>
            <select
              value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value ? Number(e.target.value) : "" })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— No branch (unassigned) —</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingWarehouse(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}