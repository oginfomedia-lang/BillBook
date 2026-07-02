import { useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Trash2, Edit2 } from "lucide-react";
import { Country, State, City } from "country-state-city";
import { useAuth } from "../../context/AuthContext";
import { useSuppliers, useCreateSupplier, useDeleteSupplier, useUpdateSupplier } from "../../hooks/useSuppliers";
import { TableSkeleton } from "../../components/ui/Skeletons";
import { Modal } from "../../components/ui/Modal";
import { formatMoney } from "../../utils/format";
import type { Supplier } from "../../types";
import { useTranslation } from "../../context/LanguageContext";
import { useBranch } from "../../context/BranchContext";

type SelectOption = { label: string; value: string };

export function SuppliersPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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

  const { hasPermission, isLoading: authLoading } = useAuth();
  const canCreateSupplier = hasPermission("suppliers.create");
  const canEditSupplier = hasPermission("suppliers.edit");
  const canDeleteSupplier = hasPermission("suppliers.delete");

  const { data, isLoading } = useSuppliers({ page, search, branch_id: currentBranchId || undefined });
  const createSupplier = useCreateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const updateSupplier = useUpdateSupplier();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Suppliers")}</h1>
          <p className="text-sm text-slate-500">{t("Manage supplier contacts, opening balances and address details.")}</p>
          <p className="text-sm text-slate-400">{data?.total ?? 0} {t("total suppliers")}</p>
        </div>
        {canCreateSupplier ? (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark shadow-sm"
          >
            <Plus size={16} />
            {t("Add Supplier")}
          </button>
        ) : authLoading ? (
          <div className="h-10 w-28" />
        ) : (
          <p className="text-sm text-slate-500">{t("You don't have permission to add suppliers.")}</p>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3">
          {/* ... all existing fields unchanged ... */}
          {/* Make sure to call buildPayload in the submit handler which already includes branch_id */}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t("Search suppliers by name…")}
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("Supplier")}</th>
              <th className="px-4 py-3">{t("Contact")}</th>
              <th className="px-4 py-3">{t("GST / Tax")}</th>
              <th className="px-4 py-3 text-right">{t("Balance")}</th>
              <th className="px-4 py-3 text-center">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : !data?.items?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No suppliers found matching your search.")}
                </td>
              </tr>
            ) : (
              data.items.map((supplier) => (
                <tr key={supplier.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{supplier.name}</p>
                    {supplier.address && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{supplier.address}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <p>{supplier.email || "—"}</p>
                    {(supplier.mobile || supplier.phone) && <p className="text-xs text-slate-400 mt-0.5">{supplier.mobile || supplier.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {supplier.gst_number || "—"}
                    {supplier.tax_number ? <span className="block text-slate-400">{supplier.tax_number}</span> : null}
                  </td>
                  <td className="figures px-4 py-3 text-right font-medium text-ink-900">{formatMoney(supplier.opening_balance)}</td>
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
                          className="rounded-md p-1.5 text-slate-400 hover:bg-danger-light hover:text-danger transition-colors"
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

      {/* Edit Modal */}
      <Modal
        isOpen={editingSupplier !== null}
        onClose={() => setEditingSupplier(null)}
        title={t("Edit Supplier")}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {/* ... all existing edit fields unchanged ... */}
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