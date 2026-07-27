import { useState, type FormEvent } from "react";
import { Plus, Search, Trash2, Edit2 } from "lucide-react";
import { useCustomers, useCreateCustomer, useDeleteCustomer, useUpdateCustomer } from "../hooks/useCustomers";
import { TableSkeleton } from "../components/ui/Skeletons";
import { Modal } from "../components/ui/Modal";
import { ExportToolbar, type ColumnDef } from "../components/ui/ExportToolbar";
import { formatMoney } from "../utils/format";
import type { Customer } from "../types";
import { useTranslation } from "../context/LanguageContext";
import { useBranch } from "../context/BranchContext";
import { validateEmail, validatePhone, formatPhone } from "../hooks/useContactValidation";
import { isValidGSTIN, GSTIN_ERROR_MESSAGE } from "../utils/validators";

const CUSTOMER_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", visible: true },
  { key: "email", label: "Email", visible: true },
  { key: "phone", label: "Phone", visible: true },
  { key: "gstin", label: "GSTIN", visible: true },
  { key: "billing_address", label: "Address", visible: true },
  { key: "balance", label: "Balance", visible: true },
];

export function CustomersPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [columns, setColumns] = useState<ColumnDef[]>(CUSTOMER_COLUMNS);

  const [form, setForm] = useState({ name: "", email: "", phone: "", billing_address: "", gstin: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", billing_address: "", gstin: "" });

  // Validation error states — create form
  const [createEmailError, setCreateEmailError] = useState("");
  const [createPhoneError, setCreatePhoneError] = useState("");
  const [createContactError, setCreateContactError] = useState("");
  const [createGstinError, setCreateGstinError] = useState("");

  // Validation error states — edit form
  const [editEmailError, setEditEmailError] = useState("");
  const [editPhoneError, setEditPhoneError] = useState("");
  const [editGstinError, setEditGstinError] = useState("");

  const { data, isLoading } = useCustomers({ page, search, branch_id: currentBranchId || undefined });
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const updateCustomer = useUpdateCustomer();

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate email + phone + GSTIN
    const emailV = validateEmail(form.email);
    const phoneV = validatePhone(form.phone);
    const gstinValid = isValidGSTIN(form.gstin);
    setCreateEmailError(emailV.error);
    setCreatePhoneError(phoneV.error);
    setCreateGstinError(gstinValid ? "" : GSTIN_ERROR_MESSAGE);

    if (!form.email.trim() && !form.phone.trim()) {
      setCreateContactError("Please provide either email or phone number");
      return;
    } else {
      setCreateContactError("");
    }
    if (emailV.error || phoneV.error || !gstinValid) return;

    const payload = { ...form, branch_id: currentBranchId || undefined };
    createCustomer.mutate(payload, {
      onSuccess: () => {
        setForm({ name: "", email: "", phone: "", billing_address: "", gstin: "" });
        setCreateEmailError("");
        setCreatePhoneError("");
        setCreateContactError("");
        setCreateGstinError("");
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

    const emailV = validateEmail(editForm.email);
    const phoneV = validatePhone(editForm.phone);
    const gstinValid = isValidGSTIN(editForm.gstin);
    setEditEmailError(emailV.error);
    setEditPhoneError(phoneV.error);
    setEditGstinError(gstinValid ? "" : GSTIN_ERROR_MESSAGE);
    if (emailV.error || phoneV.error || !gstinValid) return;

    const payload = { ...editForm, branch_id: currentBranchId || undefined };
    updateCustomer.mutate(
      { id: editingCustomer.id, payload },
      { onSuccess: () => { setEditingCustomer(null); setEditEmailError(""); setEditPhoneError(""); setEditGstinError(""); } }
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
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t("Customers")}</h1>
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
          className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 sm:grid-cols-3 shadow-sm"
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
              id="create-email"
              type="text"
              placeholder="e.g. billing@acme.com"
              value={form.email}
              onChange={(e) => {
                const lc = e.target.value.toLowerCase();
                setForm({ ...form, email: lc });
                setCreateEmailError(validateEmail(lc).error);
                setCreateContactError("");
              }}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${createEmailError ? "border-red-400 focus:ring-red-400" : form.email && !createEmailError ? "border-green-400 focus:ring-green-400" : "border-slate-200 focus:ring-brand"
                }`}
            />
            <p className="mt-0.5 text-xs text-slate-400">e.g. username@domain.com</p>
            {createEmailError && <p id="create-email-error" className="mt-1 text-xs text-red-500">{createEmailError}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Phone Number")}</label>
            <input
              id="create-phone"
              placeholder="Format: +91-98765-43210"
              value={form.phone}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                setForm({ ...form, phone: formatted });
                setCreatePhoneError(validatePhone(formatted).error);
                setCreateContactError("");
              }}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${createPhoneError ? "border-red-400 focus:ring-red-400" : form.phone && !createPhoneError ? "border-green-400 focus:ring-green-400" : "border-slate-200 focus:ring-brand"
                }`}
            />
            <p className="mt-0.5 text-xs text-slate-400">Format: +91-98765-43210</p>
            {createPhoneError && <p id="create-phone-error" className="mt-1 text-xs text-red-500">{createPhoneError}</p>}
            {createContactError && <p className="mt-1 text-xs text-red-500">{createContactError}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("GSTIN")}</label>
            <input
              placeholder={t("e.g. 27AAAAA1111A1Z1")}
              value={form.gstin}
              onChange={(e) => {
                const upper = e.target.value.toUpperCase();
                setForm({ ...form, gstin: upper });
                setCreateGstinError(isValidGSTIN(upper) ? "" : GSTIN_ERROR_MESSAGE);
              }}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${createGstinError ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-brand"
                }`}
            />
            {createGstinError && <p className="mt-1 text-xs text-red-500">{createGstinError}</p>}
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
              onClick={() => { setShowForm(false); setCreateEmailError(""); setCreatePhoneError(""); setCreateContactError(""); }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t("Cancel")}
            </button>
            <button
              id="submit-btn"
              type="submit"
              disabled={createCustomer.isPending || !!(createEmailError || createPhoneError || createGstinError)}
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

      {/* Export Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{data?.total ?? 0} {t("records")}</span>
        <ExportToolbar
          data={(data?.items ?? []).map((c) => ({
            name: c.name,
            email: c.email ?? "",
            phone: c.phone ?? "",
            gstin: c.gstin ?? "",
            billing_address: c.billing_address ?? "",
            balance: c.balance ?? 0,
          }))}
          columns={columns}
          onColumnsChange={setColumns}
          filename="customers-list"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
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
              id="edit-email"
              type="text"
              placeholder="e.g. billing@acme.com"
              value={editForm.email}
              onChange={(e) => {
                const lc = e.target.value.toLowerCase();
                setEditForm({ ...editForm, email: lc });
                setEditEmailError(validateEmail(lc).error);
              }}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${editEmailError ? "border-red-400 focus:ring-red-400" : editForm.email && !editEmailError ? "border-green-400 focus:ring-green-400" : "border-slate-200 focus:ring-brand"
                }`}
            />
            <p className="mt-0.5 text-xs text-slate-400">e.g. username@domain.com</p>
            {editEmailError && <p id="edit-email-error" className="mt-1 text-xs text-red-500">{editEmailError}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Phone Number")}</label>
            <input
              id="edit-phone"
              placeholder="Format: +91-98765-43210"
              value={editForm.phone}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                setEditForm({ ...editForm, phone: formatted });
                setEditPhoneError(validatePhone(formatted).error);
              }}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${editPhoneError ? "border-red-400 focus:ring-red-400" : editForm.phone && !editPhoneError ? "border-green-400 focus:ring-green-400" : "border-slate-200 focus:ring-brand"
                }`}
            />
            <p className="mt-0.5 text-xs text-slate-400">Format: +91-98765-43210</p>
            {editPhoneError && <p id="edit-phone-error" className="mt-1 text-xs text-red-500">{editPhoneError}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("GSTIN")}</label>
            <input
              value={editForm.gstin}
              onChange={(e) => {
                const upper = e.target.value.toUpperCase();
                setEditForm({ ...editForm, gstin: upper });
                setEditGstinError(isValidGSTIN(upper) ? "" : GSTIN_ERROR_MESSAGE);
              }}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${editGstinError ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-brand"
                }`}
            />
            {editGstinError && <p className="mt-1 text-xs text-red-500">{editGstinError}</p>}
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
              disabled={updateCustomer.isPending || !!editGstinError}
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