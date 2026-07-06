import { useState } from "react";
import { useCustomers } from "../hooks/useCustomers";
import { useProducts } from "../hooks/useProducts";
import { useCreateInvoice } from "../hooks/useInvoices";
import { InvoiceItemsEditor } from "../components/invoices/InvoiceItemsEditor";
import { InvoiceTotals } from "../components/invoices/InvoiceTotals";
import type { InvoiceItem, InvoiceStatus, Product } from "../types";
import { CouponInput } from "./Coupons/CouponInput";
import type { InvoiceItem, InvoiceStatus } from "../types";
import { useTranslation } from "../context/LanguageContext";
import { useBranch } from "../context/BranchContext";

export function CreateInvoicePage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();
  const { data: customersData } = useCustomers({ page: 1 });
  const [productSearch, setProductSearch] = useState("");
  const { data: productsData } = useProducts({ page: 1, per_page: 100, search: productSearch });
  const createInvoice = useCreateInvoice();

  const [customerId, setCustomerId] = useState<number | "">("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
  ]);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Subtotal calculation for coupon validation
  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);

  const handleCouponApplied = (coupon: any, discount: number) => {
    setAppliedCoupon(coupon);
    setCouponDiscount(discount);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  const handleSubmit = (status: InvoiceStatus) => {
    if (!customerId) return;
    const validItems = items.filter((item) => item.description.trim().length > 0);
    if (validItems.length === 0) return;

    createInvoice.mutate({
      customer_id: customerId,
      issue_date: issueDate,
      due_date: dueDate || null,
      discount_type: discountType,
      discount_value: discountValue,
      coupon_code: appliedCoupon?.code || null,
      coupon_discount: couponDiscount,
      notes: notes || null,
      status,
      items: validItems,
      branch_id: currentBranchId || undefined,
    });
  };

  const canSubmit = customerId !== "" && items.some((item) => item.description.trim().length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{t("New Invoice")}</h1>
        <p className="text-sm text-slate-500">{t("Add line items below — totals update as you type.")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Customer")}</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">{t("Select a customer")}</option>
                {customersData?.items.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Issue date")}</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Due date")}</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </div>

          <InvoiceItemsEditor
            items={items}
            products={productsData?.items ?? []}
            onChange={setItems}
            onProductSearch={setProductSearch}
          />
          {/* Coupon Input */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Coupon")}</label>
            <CouponInput
              customerId={customerId || null}
              subtotal={subtotal}
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              initialCode={appliedCoupon?.code || ""}
            />
          </div>

          <InvoiceItemsEditor items={items} onChange={setItems} />

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Notes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("Payment terms, thank-you note, etc.")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="space-y-4">
          <InvoiceTotals
            items={items}
            discountType={discountType}
            discountValue={discountValue}
            onDiscountTypeChange={setDiscountType}
            onDiscountValueChange={setDiscountValue}
            couponDiscount={couponDiscount}
          />

          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleSubmit("pending")}
              disabled={!canSubmit || createInvoice.isPending}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createInvoice.isPending ? t("Creating…") : t("Create & Send")}
            </button>
            <button
              onClick={() => handleSubmit("draft")}
              disabled={!canSubmit || createInvoice.isPending}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("Save as draft")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}