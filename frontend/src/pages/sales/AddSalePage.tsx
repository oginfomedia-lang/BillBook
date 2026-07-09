import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useCustomers } from "../../hooks/useCustomers";
import { useProducts } from "../../hooks/useProducts";
import { useCreateInvoice } from "../../hooks/useInvoices";
import { InvoiceItemsEditor } from "../../components/invoices/InvoiceItemsEditor";
import { InvoiceTotals } from "../../components/invoices/InvoiceTotals";
import { CouponInput } from "../../components/coupons/CouponInput";
import type { InvoiceItem, InvoiceStatus, Product } from "../../types";
import { useTranslation } from "../../context/LanguageContext";
import { useBranch } from "../../context/BranchContext";

export function AddSalePage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();
  const { data: customersData } = useCustomers({ page: 1 });
  const createInvoice = useCreateInvoice();

  const [customerId, setCustomerId] = useState<number | "">("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const { data: productsData } = useProducts({ page: 1, per_page: 100, search: productSearch });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
  ]);

  const stockValidationErrors = useMemo(() => {
    const productById = new Map<number, Product>();
    productsData?.items.forEach((product) => productById.set(product.id, product));

    const requestedQuantities = items.reduce((acc, item) => {
      if (!item.product_id) return acc;
      const existing = acc.get(item.product_id) ?? 0;
      acc.set(item.product_id, existing + item.quantity);
      return acc;
    }, new Map<number, number>());

    return items.map((item) => {
      if (!item.product_id) return "";
      const product = productById.get(item.product_id);
      if (!product) return "";
      if (product.stock_quantity <= 0) {
        return "Out of Stock. Please reduce the quantity.";
      }

      const totalRequested = requestedQuantities.get(item.product_id) ?? 0;
      if (totalRequested > product.stock_quantity) {
        return `Only ${product.stock_quantity} pcs available in stock. Please reduce the quantity.`;
      }

      return "";
    });
  }, [items, productsData]);

  const hasStockValidationErrors = stockValidationErrors.some(Boolean);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

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
    if (hasStockValidationErrors) {
      toast.error("Please reduce the quantity to the available stock before creating the sale.");
      return;
    }

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

  const canSubmit = customerId !== "" && items.some((item) => item.description.trim().length > 0) && !hasStockValidationErrors;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("Add Sale")}</h2>
          <p className="text-sm text-slate-500">{t("Create a sales invoice for the POS flow or customer billing.")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Customer")}</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">{t("Select a customer")}</option>
              {customersData?.items.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
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

        {/* Coupon Input */}
        <InvoiceItemsEditor
          items={items}
          onChange={setItems}
          products={productsData?.items ?? []}
          onProductSearch={setProductSearch}
          itemErrors={stockValidationErrors}
        />

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

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => handleSubmit("pending")}
            disabled={!canSubmit || createInvoice.isPending}
            className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createInvoice.isPending ? "Saving…" : "Create & Send"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={!canSubmit || createInvoice.isPending}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-ink-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createInvoice.isPending ? "Saving…" : "Save as draft"}
          </button>
        </div>
      </div>
    </div>
  );
}