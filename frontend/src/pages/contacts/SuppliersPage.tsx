// src/pages/contacts/SuppliersPage.tsx

import { useState, useMemo, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { Modal } from "../../components/ui/Modal";
import { ExportToolbar, type ColumnDef } from "../../components/ui/ExportToolbar";
import { formatMoney } from "../../utils/format";
import {
  useSuppliers,
  useDeleteSupplier,
  useCreateSupplier,
  useUpdateSupplier
} from "../../hooks/useSuppliers";
import { useTranslation } from "../../context/LanguageContext";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";
import { Country, State, City } from "country-state-city";
import type { Supplier } from "../../api/suppliers";

type SelectOption = { label: string; value: string };

const SUPPLIER_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", visible: true },
  { key: "mobile", label: "Mobile", visible: true },
  { key: "email", label: "Email", visible: true },
  { key: "gst_number", label: "GST Number", visible: true },
  { key: "opening_balance", label: "Balance", visible: true },
  { key: "city", label: "City", visible: true },
  { key: "country", label: "Country", visible: true },
];

export function SuppliersPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { currentBranchId } = useBranch();

  // ✅ State declarations - only once
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [columns, setColumns] = useState<ColumnDef[]>(SUPPLIER_COLUMNS);

  // ✅ Data fetching - only once
  const { data, isLoading } = useSuppliers({ page, search, branch_id: currentBranchId || undefined });
  const deleteSupplier = useDeleteSupplier();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const suppliers = data?.items ?? [];

  const defaultForm = {
    name: "",
    mobile: "",
    email: "",
    phone: "",
    gst_number: "",
    tax_number: "",
    opening_balance: 0,
    country: "",
    country_code: "",
    state: "",
    state_code: "",
    city: "",
    city_code: "",
    postcode: "",
    address: "",
  };

  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState(defaultForm);

  // Countries
  const countryOptions: SelectOption[] = useMemo(
    () => Country.getAllCountries().map((item: any) => ({ label: item.name, value: item.isoCode })),
    []
  );

  // States for create form
  const createStateOptions: SelectOption[] = useMemo(
    () =>
      form.country_code
        ? State.getStatesOfCountry(form.country_code).map((item: any) => ({ label: item.name, value: item.isoCode }))
        : [],
    [form.country_code]
  );

  // Cities for create form
  const createCityOptions: SelectOption[] = useMemo(
    () =>
      form.country_code && form.state_code
        ? City.getCitiesOfState(form.country_code, form.state_code).map((item: any) => ({ label: item.name, value: item.isoCode }))
        : [],
    [form.country_code, form.state_code]
  );

  // States for edit form
  const editStateOptions: SelectOption[] = useMemo(
    () =>
      editForm.country_code
        ? State.getStatesOfCountry(editForm.country_code).map((item: any) => ({ label: item.name, value: item.isoCode }))
        : [],
    [editForm.country_code]
  );

  // Cities for edit form
  const editCityOptions: SelectOption[] = useMemo(
    () =>
      editForm.country_code && editForm.state_code
        ? City.getCitiesOfState(editForm.country_code, editForm.state_code).map((item: any) => ({ label: item.name, value: item.isoCode }))
        : [],
    [editForm.country_code, editForm.state_code]
  );

  const findCountryCode = (name: string) =>
    countryOptions.find((option: SelectOption) => option.label === name)?.value ?? "";

  const findStateCode = (stateName: string, countryCode: string) =>
    countryCode
      ? State.getStatesOfCountry(countryCode).find((item: any) => item.name === stateName)?.isoCode ?? ""
      : "";

  const findCityCode = (cityName: string, countryCode: string, stateCode: string) =>
    countryCode && stateCode
      ? (City.getCitiesOfState(countryCode, stateCode).find((item: any) => item.name === cityName) as any)?.isoCode ?? ""
      : "";

  const buildPayload = (payload: typeof defaultForm) => ({
    name: payload.name,
    mobile: payload.mobile || null,
    email: payload.email || null,
    phone: payload.phone || null,
    gst_number: payload.gst_number || null,
    tax_number: payload.tax_number || null,
    opening_balance: payload.opening_balance || 0,
    country: payload.country || null,
    state: payload.state || null,
    city: payload.city || null,
    postcode: payload.postcode || null,
    address: payload.address || null,
    branch_id: currentBranchId || undefined,
  });

  const canCreateSupplier = hasPermission("suppliers.create");
  const canEditSupplier = hasPermission("suppliers.edit");
  const canDeleteSupplier = hasPermission("suppliers.delete");

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    createSupplier.mutate(buildPayload(form), {
      onSuccess: () => {
        setForm(defaultForm);
        setShowForm(false);
      },
    });
  };

  const handleEditClick = (supplier: Supplier) => {
    const country_code = findCountryCode(supplier.country || "");
    const state_code = findStateCode(supplier.state || "", country_code);
    const city_code = findCityCode(supplier.city || "", country_code, state_code);

    setEditingSupplier(supplier);
    setEditForm({
      name: supplier.name,
      mobile: supplier.mobile || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      gst_number: supplier.gst_number || "",
      tax_number: supplier.tax_number || "",
      opening_balance: supplier.opening_balance || 0,
      country: supplier.country || "",
      country_code,
      state: supplier.state || "",
      state_code,
      city: supplier.city || "",
      city_code,
      postcode: supplier.postcode || "",
      address: supplier.address || "",
    });
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    updateSupplier.mutate(
      { id: editingSupplier.id, payload: buildPayload(editForm) },
      { onSuccess: () => setEditingSupplier(null) }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm(t("Are you sure you want to remove this supplier?"))) {
      deleteSupplier.mutate(id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Suppliers")}</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} {t("total")}</p>
        </div>
        {canCreateSupplier && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} /> {t("Add Supplier")}
          </button>
        )}
      </div>

      {/* ── Create Form ──────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Supplier Name")}</label>
            <input
              required
              placeholder={t("e.g. Acme Suppliers")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Mobile")}</label>
            <input
              placeholder={t("e.g. +91 98765 43210")}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Email")}</label>
            <input
              type="email"
              placeholder={t("e.g. supplier@example.com")}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Phone")}</label>
            <input
              placeholder={t("e.g. 022 1234 5678")}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("GST Number")}</label>
            <input
              placeholder={t("e.g. 27AAAAA1111A1Z1")}
              value={form.gst_number}
              onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Tax Number")}</label>
            <input
              placeholder={t("e.g. 123456789")}
              value={form.tax_number}
              onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Opening Balance")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.opening_balance || ""}
              onChange={(e) => setForm({ ...form, opening_balance: Number(e.target.value) || 0 })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Country")}</label>
            <input
              list="country-options-create"
              placeholder={t("Start typing or choose a country")}
              value={form.country}
              onChange={(e) => {
                const country = e.target.value;
                const country_code = findCountryCode(country);
                setForm({ ...form, country, country_code, state: "", state_code: "", city: "", city_code: "" });
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <datalist id="country-options-create">
              {countryOptions.map((option: SelectOption) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("State")}</label>
            <input
              list="state-options-create"
              placeholder={form.country_code ? t("Start typing or choose a state") : t("Select country first")}
              value={form.state}
              disabled={!form.country_code}
              onChange={(e) => {
                const state = e.target.value;
                const state_code = findStateCode(state, form.country_code);
                setForm({ ...form, state, state_code, city: "", city_code: "" });
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <datalist id="state-options-create">
              {createStateOptions.map((option: SelectOption) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("City")}</label>
            <input
              list="city-options-create"
              placeholder={form.state_code ? t("Start typing or choose a city") : t("Select state first")}
              value={form.city}
              disabled={!form.state_code}
              onChange={(e) => {
                const city = e.target.value;
                const city_code = findCityCode(city, form.country_code, form.state_code);
                setForm({ ...form, city, city_code });
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <datalist id="city-options-create">
              {createCityOptions.map((option: SelectOption) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Postcode")}</label>
            <input
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Address")}</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand h-24 resize-none"
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
              disabled={createSupplier.isPending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {createSupplier.isPending ? t("Saving…") : t("Save Supplier")}
            </button>
          </div>
        </form>
      )}

      {/* ── Search ────────────────────────────────────────────────────── */}
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t("Search suppliers by name…")}
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Export Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{data?.total ?? 0} {t("records")}</span>
        <ExportToolbar
          data={suppliers.map((s) => ({
            name: s.name,
            mobile: s.mobile ?? "",
            email: s.email ?? "",
            gst_number: s.gst_number ?? "",
            opening_balance: s.opening_balance ?? 0,
            city: s.city ?? "",
            country: s.country ?? "",
          }))}
          columns={columns}
          onColumnsChange={setColumns}
          filename="suppliers-list"
        />
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("Supplier Name")}</th>
              <th className="px-4 py-3">{t("Contact")}</th>
              <th className="px-4 py-3">{t("GST Number")}</th>
              <th className="px-4 py-3 text-right">{t("Opening Balance")}</th>
              <th className="w-24 px-4 py-3 text-center">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No suppliers found matching your search.")}
                </td>
              </tr>
            ) : (
              suppliers.map((supplier: any) => (
                <tr key={supplier.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/65 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{supplier.name}</p>
                    {supplier.address && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{supplier.address}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <p>{supplier.email || "—"}</p>
                    {supplier.phone && <p className="text-xs text-slate-400 mt-0.5">{supplier.phone}</p>}
                    {supplier.mobile && <p className="text-xs text-slate-400">{supplier.mobile}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{supplier.gst_number || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">
                    {formatMoney(supplier.opening_balance || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {canEditSupplier && (
                        <button
                          onClick={() => handleEditClick(supplier)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900 transition-colors"
                          aria-label={t("Edit supplier")}
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canDeleteSupplier && (
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                          aria-label={t("Delete supplier")}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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
          <span className="text-sm text-slate-500">{t("Page")} {data.page} {t("of")} {data.pages}</span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            {t("Next")}
          </button>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={editingSupplier !== null}
        onClose={() => setEditingSupplier(null)}
        title={t("Edit Supplier")}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Supplier Name")}</label>
            <input
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Mobile")}</label>
            <input
              value={editForm.mobile}
              onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Email")}</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Phone")}</label>
            <input
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("GST Number")}</label>
            <input
              value={editForm.gst_number}
              onChange={(e) => setEditForm({ ...editForm, gst_number: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Tax Number")}</label>
            <input
              value={editForm.tax_number}
              onChange={(e) => setEditForm({ ...editForm, tax_number: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Opening Balance")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={editForm.opening_balance || ""}
              onChange={(e) => setEditForm({ ...editForm, opening_balance: Number(e.target.value) || 0 })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Country")}</label>
            <input
              list="country-options-edit"
              placeholder={t("Start typing or choose a country")}
              value={editForm.country}
              onChange={(e) => {
                const country = e.target.value;
                const country_code = findCountryCode(country);
                setEditForm({ ...editForm, country, country_code, state: "", state_code: "", city: "", city_code: "" });
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <datalist id="country-options-edit">
              {countryOptions.map((option: SelectOption) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("State")}</label>
            <input
              list="state-options-edit"
              placeholder={editForm.country_code ? t("Start typing or choose a state") : t("Select country first")}
              value={editForm.state}
              disabled={!editForm.country_code}
              onChange={(e) => {
                const state = e.target.value;
                const state_code = findStateCode(state, editForm.country_code);
                setEditForm({ ...editForm, state, state_code, city: "", city_code: "" });
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <datalist id="state-options-edit">
              {editStateOptions.map((option: SelectOption) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("City")}</label>
            <input
              list="city-options-edit"
              placeholder={editForm.state_code ? t("Start typing or choose a city") : t("Select state first")}
              value={editForm.city}
              disabled={!editForm.state_code}
              onChange={(e) => {
                const city = e.target.value;
                const city_code = findCityCode(city, editForm.country_code, editForm.state_code);
                setEditForm({ ...editForm, city, city_code });
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <datalist id="city-options-edit">
              {editCityOptions.map((option: SelectOption) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Postcode")}</label>
            <input
              value={editForm.postcode}
              onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Address")}</label>
            <textarea
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand h-24 resize-none"
            />
          </div>
          {/* Add your edit form fields here */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingSupplier(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={updateSupplier.isPending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {updateSupplier.isPending ? t("Saving…") : t("Save Changes")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}