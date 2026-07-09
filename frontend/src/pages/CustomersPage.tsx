import { useState, type FormEvent } from "react";
import { Plus, Search, Trash2, Edit2 } from "lucide-react";
import { useCustomers, useCreateCustomer, useDeleteCustomer, useUpdateCustomer } from "../hooks/useCustomers";
import { TableSkeleton } from "../components/ui/Skeletons";
import { Modal } from "../components/ui/Modal";
import { formatMoney } from "../utils/format";
import type { Customer } from "../types";
import { useTranslation } from "../context/LanguageContext";
import { useBranch } from "../context/BranchContext";

export function CustomersPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    billing_address: "",
    gstin: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    billing_address: "",
    gstin: "",
  });

  const { data, isLoading } = useCustomers({ page, search, branch_id: currentBranchId || undefined });
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const updateCustomer = useUpdateCustomer();

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      branch_id: currentBranchId || undefined,
    };
    createCustomer.mutate(payload, {
      onSuccess: () => {
        setForm({
          name: "",
          email: "",
          phone: "",
          billing_address: "",
          gstin: "",
        });
        setShowForm(false);
      },
    });
  };

  const handleEditClick = (c: Customer) => {
    setEditingCustomer(c);
    setEditForm({
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      billing_address: c.billing_address || "",
      gstin: c.gstin || "",
    });
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    const payload = {
      ...editForm,
      branch_id: currentBranchId || undefined,
    };
    updateCustomer.mutate(
      { id: editingCustomer.id, payload },
      {
        onSuccess: () => {
          setEditingCustomer(null);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm(t("Are you sure you want to remove this customer?"))) {
      deleteCustomer.mutate(id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Customers")}</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} {t("total")}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark shadow-sm"
        >
          <Plus size={16} />
          {t("Add Customer")}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-3 shadow-sm"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Customer Name")}</label>
            <input
              required
              placeholder={t("e.g. Acme Corp")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Email Address")}</label>
            <input
              type="email"
              placeholder={t("e.g. billing@acme.com")}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Phone Number")}</label>
            <input
              placeholder={t("e.g. +91 98765 43210")}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("GSTIN")}</label>
            <input
              placeholder={t("e.g. 27AAAAA1111A1Z1")}
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Billing Address")}</label>
            <input
              placeholder={t("e.g. 123 Main St, Mumbai, MH")}
              value={form.billing_address}
              onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="sm:col-span-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={createCustomer.isPending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {createCustomer.isPending ? t("Saving…") : t("Save Customer")}
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("Search customers by name…")}
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand shadow-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("Customer Name")}</th>
              <th className="px-4 py-3">{t("Contact")}</th>
              <th className="px-4 py-3">{t("GSTIN")}</th>
              <th className="px-4 py-3 text-right">{t("Balance Due")}</th>
              <th className="w-24 px-4 py-3 text-center">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No customers found matching your search.")}
                </td>
              </tr>
            ) : (
              data?.items.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/65 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{c.name}</p>
                    {c.billing_address && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.billing_address}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <p>{c.email || "—"}</p>
                    {c.phone && <p className="text-xs text-slate-400 mt-0.5">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.gstin || "—"}</td>
                  <td className="figures px-4 py-3 text-right font-medium text-ink-900">{formatMoney(c.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEditClick(c)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900 transition-colors"
                        aria-label={t("Edit customer")}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-danger-light hover:text-danger transition-colors"
                        aria-label={t("Delete customer")}
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
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            {t("Previous")}
          </button>
          <span className="text-sm text-slate-500">
            {t("Page")} {data.page} {t("of")} {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            {t("Next")}
          </button>
        </div>
      )}

      <Modal
        isOpen={editingCustomer !== null}
        onClose={() => setEditingCustomer(null)}
        title={t("Edit Customer")}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Customer Name")}</label>
            <input
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Email Address")}</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Phone Number")}</label>
            <input
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("GSTIN")}</label>
            <input
              value={editForm.gstin}
              onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Billing Address")}</label>
            <input
              value={editForm.billing_address}
              onChange={(e) => setEditForm({ ...editForm, billing_address: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingCustomer(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={updateCustomer.isPending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {updateCustomer.isPending ? t("Saving…") : t("Save Changes")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}