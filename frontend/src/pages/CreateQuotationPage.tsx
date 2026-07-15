import { useState } from "react";
import { useCustomers } from "../hooks/useCustomers";
import { useItems } from "../hooks/useItems";
import { useWarehouses } from "../hooks/useWarehouses";
import { useCreateQuotation } from "../hooks/useQuotations";
import { InvoiceItemsEditor } from "../components/invoices/InvoiceItemsEditor";
import { InvoiceTotals } from "../components/invoices/InvoiceTotals";
import { TermsEditor } from "../components/ui/TermsEditor";
import type { InvoiceItem } from "../types";

export function CreateQuotationPage() {
  const { data: customersData } = useCustomers({ page: 1 });
  const [productSearch, setProductSearch] = useState("");
  const { data: itemsData } = useItems({ page: 1, per_page: 100, search: productSearch });
  const { data: warehousesData } = useWarehouses({ page: 1, per_page: 100 });
  const createQuotation = useCreateQuotation();

  const [customerId, setCustomerId] = useState<number | "">("");
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState(
    `1. Payment Terms: 50% advance, balance before delivery
2. Delivery: Within 7 working days
3. Warranty: 30 days from delivery
4. Returns: Accepted within 7 days
5. GST Extra as applicable
6. This quotation is valid for 30 days
7. Prices subject to change without notice`
  );
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
  ]);

  const handleSubmit = () => {
    if (!customerId) return;
    const validItems = items.filter((item) => item.description.trim().length > 0);
    if (validItems.length === 0) return;

    createQuotation.mutate({
      customer_id: customerId,
      warehouse_id: warehouseId || null,
      issue_date: issueDate,
      expiry_date: expiryDate || null,
      discount_type: discountType,
      discount_value: discountValue,
      notes: notes || null,
      terms_conditions: termsConditions || null,
      status: "sent",
      items: validItems,
    });
  };

  const canSubmit = customerId !== "" && warehouseId !== "" && items.some((item) => item.description.trim().length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">New Quotation</h1>
        <p className="text-sm text-slate-500">Create a quotation for a customer and send it for approval.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Select a customer</option>
                {customersData?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Warehouse</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Select a warehouse</option>
                {warehousesData?.items.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Issue date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Expiry date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </div>

          <InvoiceItemsEditor
            items={items}
            products={itemsData?.items ?? []}
            onChange={setItems}
            onProductSearch={setProductSearch}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional quote terms and notes."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Terms & Conditions Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <TermsEditor
              value={termsConditions}
              onChange={setTermsConditions}
              label="Terms & Conditions"
              placeholder="Enter your terms and conditions here..."
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
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || createQuotation.isPending}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createQuotation.isPending ? "Saving…" : "Create Quotation"}
          </button>
        </div>
      </div>
    </div>
  );
}