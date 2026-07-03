import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBranch, useCreateBranch, useUpdateBranch } from "../../hooks/useBranches";
import { useTranslation } from "../../context/LanguageContext";
import toast from "react-hot-toast";

export function BranchFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: branchData, isLoading: branchLoading } = useBranch(id ? Number(id) : undefined);
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();

  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    is_active: true,
  });

  useEffect(() => {
    if (isEdit && branchData) {
      setForm({
        name: branchData.name,
        code: branchData.code,
        address: branchData.address || "",
        phone: branchData.phone || "",
        email: branchData.email || "",
        is_active: branchData.is_active,
      });
    }
  }, [branchData, isEdit]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      toast.error(t("Please fill in all required fields."));
      return;
    }

    const payload = {
      name: form.name,
      code: form.code.toUpperCase(),
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      is_active: form.is_active,
    };

    if (isEdit && id) {
      updateBranch.mutate(
        { id: Number(id), payload },
        { onSuccess: () => navigate("/branches") }
      );
    } else {
      createBranch.mutate(payload, { onSuccess: () => navigate("/branches") });
    }
  };

  if (isEdit && branchLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">
          {isEdit ? t("Edit Branch") : t("New Branch")}
        </h1>
        <p className="text-sm text-slate-500">
          {isEdit ? t("Update branch details") : t("Create a new branch")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Branch Name")} *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("e.g. Mumbai Office")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Branch Code")} *</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder={t("e.g. MUM-01")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand font-mono uppercase"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Address")}</label>
          <textarea
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={t("Street, City, State, Pincode")}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Phone")}</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("e.g. +91 98765 43210")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Email")}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t("e.g. branch@company.com")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            {t("Active")}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate("/branches")}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={createBranch.isPending || updateBranch.isPending}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {createBranch.isPending || updateBranch.isPending ? t("Saving…") : isEdit ? t("Update") : t("Create")}
          </button>
        </div>
      </form>
    </div>
  );
}