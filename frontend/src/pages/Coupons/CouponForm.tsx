import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCoupon, useCreateCoupon, useUpdateCoupon } from "../../hooks/useCoupons";
import { useCustomers } from "../../hooks/useCustomers";
import { useTranslation } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import { useBranch } from "../../context/BranchContext";

export function CouponFormPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();  // 👈 added
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: couponData, isLoading: couponLoading } = useCoupon(id ? Number(id) : undefined);
  const { data: customersData } = useCustomers({ page: 1, per_page: 1000 });
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    occasion: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    expiry_date: "",
    is_active: true,
    max_uses: 0,
    customer_id: "",
  });

  useEffect(() => {
    if (isEdit && couponData) {
      setForm({
        code: couponData.code,
        name: couponData.name,
        description: couponData.description || "",
        occasion: couponData.occasion || "",
        type: couponData.type,
        value: String(couponData.value),
        expiry_date: couponData.expiry_date || "",
        is_active: couponData.is_active,
        max_uses: couponData.max_uses,
        customer_id: couponData.customer_id ? String(couponData.customer_id) : "",
      });
    }
  }, [couponData, isEdit]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.value) {
      toast.error(t("Please fill in all required fields."));
      return;
    }

    let expiryDate = form.expiry_date;
    if (expiryDate) {
      if (expiryDate.includes('/')) {
        const parts = expiryDate.split('/');
        if (parts.length === 3) {
          expiryDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      } else if (expiryDate.includes('-')) {
        const d = new Date(expiryDate);
        if (!isNaN(d.getTime())) {
          expiryDate = d.toISOString().split('T')[0];
        }
      }
    }

    const payload = {
      name: form.name,
      ...(form.code ? { code: form.code } : {}),
      description: form.description || null,
      occasion: form.occasion || null,
      type: form.type,
      value: Number(form.value),
      expiry_date: expiryDate || null,
      is_active: form.is_active,
      max_uses: form.max_uses || 0,
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      branch_id: currentBranchId || undefined,  // 👈 added
    };

    if (isEdit && id) {
      updateCoupon.mutate(
        { id: Number(id), payload },
        { onSuccess: () => navigate("/coupons") }
      );
    } else {
      createCoupon.mutate(payload, { onSuccess: () => navigate("/coupons") });
    }

    setForm(prev => ({ ...prev, expiry_date: expiryDate }));
  };

  if (isEdit && couponLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">
          {isEdit ? t("Edit Coupon") : t("New Coupon")}
        </h1>
        <p className="text-sm text-slate-500">
          {isEdit ? t("Update coupon details") : t("Create a new discount coupon")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Coupon Code")}</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder={t("Leave blank to auto-generate")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand font-mono uppercase"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Name")} *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("e.g. Festival Sale")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Occasion")}</label>
            <input
              value={form.occasion}
              onChange={(e) => setForm({ ...form, occasion: e.target.value })}
              placeholder={t("e.g. New Year, Festival")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Expiry Date")}</label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Type")} *</label>
            <select
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="percentage">{t("Percentage")}</option>
              <option value="fixed">{t("Fixed Amount")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Value")} *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === "percentage" ? "%" : "₹"}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Max Uses")}</label>
            <input
              type="number"
              min="0"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })}
              placeholder={t("0 = unlimited")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Customer (Optional)")}</label>
          <select
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">{t("All Customers")}</option>
            {customersData?.items.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Description")}</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t("Add notes about this coupon...")}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
          />
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
            onClick={() => navigate("/coupons")}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={createCoupon.isPending || updateCoupon.isPending}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {createCoupon.isPending || updateCoupon.isPending ? t("Saving…") : isEdit ? t("Update") : t("Create")}
          </button>
        </div>
      </form>
    </div>
  );
}