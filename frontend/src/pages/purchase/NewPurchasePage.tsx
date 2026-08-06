// src/pages/purchase/NewPurchasePage.tsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Search,
  Plus,
  Trash2,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { DemoGuard } from "../../components/DemoGuard";
import {
  createPurchase,
  getPurchase,
  updatePurchase,
  addPurchasePayment,
  deletePurchasePayment,
  type PurchaseItem,
  type Purchase,
  type PurchasePayment,
  type PurchasePayload,
  type PurchasePaymentType,
} from "../../api/purchases";
import { listSuppliers } from "../../api/suppliers";
import { listWarehouses, type Warehouse } from "../../api/warehouses";
import { listItems, type Item } from "../../api/items";
import type { Supplier } from "../../types";
import { formatMoney, formatDate } from "../../utils/format";
import { PurchaseReceiptModal } from "../../components/PurchaseReceiptModal";

// -------------------------------------------------------------------
// Empty line item factory
// -------------------------------------------------------------------
const emptyItem = (): PurchaseItem => ({
  description: "",
  quantity: 1,
  purchase_price: 0,
  discount: 0,
  tax_amount: 0,
  unit_cost: 0,
  line_total: 0,
});

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function calcLineTotal(item: PurchaseItem) {
  const base = item.quantity * item.purchase_price;
  return Math.max(0, base - item.discount + item.tax_amount);
}

const PAYMENT_TYPES: PurchasePaymentType[] = ["cash", "bank", "upi", "cheque", "card", "other"];
const OTHER_CHARGE_TYPES = ["Shipping", "Handling", "Insurance", "Tax", "Other"];
const DISCOUNT_TYPES = ["flat", "percent"] as const;

// -------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------
export function NewPurchasePage({ editMode = false }: { editMode?: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const purchaseId = id ? parseInt(id) : null;

  // ---- form state ----
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([emptyItem()]);

  // Charges & discounts
  const [otherCharges, setOtherCharges] = useState(0);
  const [otherChargesType, setOtherChargesType] = useState("");
  const [discountOnAll, setDiscountOnAll] = useState(0);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"draft" | "ordered" | "received" | "partial" | "cancelled">("received");

  // Payment section
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<PurchasePaymentType>("cash");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [existingPayments, setExistingPayments] = useState<PurchasePayment[]>([]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [addingPayment, setAddingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

  // Dropdowns data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Item[]>([]);

  // Search states
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editMode);
  const [createdPurchase, setCreatedPurchase] = useState<Purchase | null>(null);

  // Load reference data
  useEffect(() => {
    Promise.all([
      listWarehouses({ per_page: 100 }),
      listSuppliers({ per_page: 200 }),
      listItems({ per_page: 200 }),
    ]).then(([w, s, p]) => {
      setWarehouses(w.items);
      setSuppliers(s.items);
      setProducts(p.items);
    });
  }, []);

  // Load existing purchase for edit
  useEffect(() => {
    if (editMode && purchaseId) {
      setLoading(true);
      getPurchase(purchaseId)
        .then((p: Purchase) => {
          setWarehouseId(p.warehouse_id ?? "");
          setSupplierId(p.supplier_id);
          setSupplierSearch(p.supplier?.name ?? "");
          setPurchaseDate(p.purchase_date ?? todayISO());
          setReferenceNo(p.reference_no ?? "");
          setItems(p.items?.length ? p.items : [emptyItem()]);
          setOtherCharges(p.other_charges);
          setOtherChargesType(p.other_charges_type ?? "");
          setDiscountOnAll(p.discount_on_all);
          setDiscountType(p.discount_type || "flat");
          setNote(p.note ?? "");
          setStatus(p.status || "received");
          setExistingPayments(p.payments ?? []);
          setAmountPaid(p.amount_paid ?? 0);
          setPaymentStatus(p.payment_status ?? "pending");
        })
        .catch(() => toast.error("Failed to load purchase"))
        .finally(() => setLoading(false));
    }
  }, [editMode, purchaseId]);

  // ------- Derived totals -------
  const subtotal = items.reduce((s, it) => s + it.quantity * it.purchase_price, 0);
  const taxTotal = items.reduce((s, it) => s + it.tax_amount, 0);
  const discountTotal =
    discountType === "percent" ? subtotal * (discountOnAll / 100) : discountOnAll;
  const otherTotal = otherCharges;
  const rawGrand = subtotal + taxTotal - discountTotal + otherTotal;
  const roundOff = Math.round(rawGrand) - rawGrand;
  const grandTotal = rawGrand + roundOff;
  const totalQty = items.reduce((s, it) => s + it.quantity, 0);

  // ------- Item helpers -------
  const updateItem = useCallback((idx: number, patch: Partial<PurchaseItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      next[idx].line_total = calcLineTotal(next[idx]);
      next[idx].unit_cost = next[idx].quantity
        ? (next[idx].quantity * next[idx].purchase_price) / next[idx].quantity
        : 0;
      return next;
    });
  }, []);

  const addItemFromProduct = (product: Item) => {
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        description: product.item_name,
        quantity: 1,
        purchase_price: product.purchase_price || 0,
        discount: 0,
        tax_amount: 0,
        unit_cost: product.purchase_price || 0,
        line_total: product.purchase_price || 0,
      },
    ]);
    setItemSearch("");
    setItemDropdownOpen(false);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ------- Submit -------
  const handleSave = async () => {
    if (!supplierId) { toast.error("Please select a supplier"); return; }
    if (items.some((it) => !it.description.trim())) {
      toast.error("All items must have a description");
      return;
    }

    setSaving(true);
    try {
      const payload: PurchasePayload = {
        supplier_id: Number(supplierId),
        warehouse_id: warehouseId !== "" ? Number(warehouseId) : null,
        purchase_date: purchaseDate,
        reference_no: referenceNo || null,
        other_charges: otherCharges,
        other_charges_type: otherChargesType || null,
        discount_on_all: discountOnAll,
        discount_type: discountType,
        note: note || null,
        status: status,
        items: items.map((it) => ({
          product_id: it.product_id ?? null,
          description: it.description,
          quantity: it.quantity,
          purchase_price: it.purchase_price,
          discount: it.discount,
          tax_amount: it.tax_amount,
        })),
        payment: !editMode && paymentAmount > 0 ? {
          amount: paymentAmount,
          payment_type: paymentType,
          account: paymentAccount || null,
          payment_note: paymentNote || null,
          payment_date: purchaseDate,
        } : null,
      };

      if (editMode && purchaseId) {
        await updatePurchase(purchaseId, payload);
        toast.success("Purchase updated successfully!");
        navigate("/purchase/list");
      } else {
        const created = await createPurchase(payload);
        toast.success("Purchase created successfully!");
        // Show receipt modal — user navigates after closing
        setCreatedPurchase(created);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save purchase");
    } finally {
      setSaving(false);
    }
  };

  // ------- Add extra payment (edit mode) -------
  const handleAddPayment = async () => {
    if (!purchaseId || paymentAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setAddingPayment(true);
    try {
      const updated = await addPurchasePayment(purchaseId, {
        amount: paymentAmount,
        payment_type: paymentType,
        account: paymentAccount || null,
        payment_note: paymentNote || null,
        payment_date: purchaseDate,
      });

      // Update local state immediately from the API response
      setExistingPayments(updated.payments ?? []);
      setAmountPaid(updated.amount_paid ?? 0);
      setPaymentStatus(updated.payment_status ?? "pending");
      setPaymentAmount(0);
      setPaymentNote("");
      toast.success(`Payment of ₹${updated.amount_paid?.toLocaleString("en-IN")} recorded! Status: ${updated.payment_status}`);

    } catch (error) {
      toast.error("Failed to record payment");
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!purchaseId) return;
    setDeletingPaymentId(paymentId);
    try {
      await deletePurchasePayment(purchaseId, paymentId);
      // Re-fetch to get accurate totals
      const refreshed = await getPurchase(purchaseId);
      setExistingPayments(refreshed.payments ?? []);
      setAmountPaid(refreshed.amount_paid ?? 0);
      setPaymentStatus(refreshed.payment_status ?? "pending");
      toast.success("Payment removed");
    } catch {
      toast.error("Failed to remove payment");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  // Filtered supplier list for search
  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.mobile ?? "").includes(supplierSearch)
  );

  // Filtered products for item search
  const filteredProducts = products.filter((p) =>
    p.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (p.item_code ?? "").toLowerCase().includes(itemSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e6fa8] border-t-transparent" />
      </div>
    );
  }

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-brand" onClick={() => navigate("/dashboard")}>
          Home
        </span>
        <ChevronRight size={12} />
        <span
          className="cursor-pointer hover:text-brand"
          onClick={() => navigate("/purchase/list")}
        >
          Purchase List
        </span>
        <ChevronRight size={12} />
        <span className="font-medium text-slate-700">
          {editMode ? "Edit Purchase" : "New Purchase"}
        </span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Purchase</h1>
        <p className="text-xs text-slate-500">
          {editMode ? "Edit Purchase" : "Add / Update Purchase"}
        </p>
      </div>

      {/* ─── Header Form ─── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Warehouse */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <select
              value={warehouseId}
              onChange={(e) =>
                setWarehouseId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
            >
              <option value="">System Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Purchase Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
            />
          </div>

          {/* Supplier */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="flex">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setSupplierDropdownOpen(true);
                      if (!e.target.value) { setSupplierId(""); }
                    }}
                    onFocus={() => setSupplierDropdownOpen(true)}
                    placeholder="Search Name/Mobile"
                    className="w-full rounded-l-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
                  />
                </div>
                <button
                  type="button"
                  className="flex items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-[#1e6fa8] px-3 text-white hover:bg-[#1a5f90]"
                  title="Add supplier"
                >
                  <UserPlus size={15} />
                </button>
              </div>
              {supplierDropdownOpen && filteredSuppliers.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredSuppliers.slice(0, 10).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => {
                        setSupplierId(s.id);
                        setSupplierSearch(s.name);
                        setSupplierDropdownOpen(false);
                      }}
                      className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                      {s.mobile && (
                        <span className="text-xs text-slate-400">{s.mobile}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedSupplier && (
              <p className="text-xs text-emerald-600">
                ✓ {selectedSupplier.name}
                {selectedSupplier.mobile ? ` · ${selectedSupplier.mobile}` : ""}
              </p>
            )}
          </div>

          {/* Reference No */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Reference No.</label>
            <input
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Reference number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
            >
              <option value="received">Received</option>
              <option value="ordered">Ordered</option>
              <option value="partial">Partial</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Item Search Bar ─── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                setItemDropdownOpen(true);
              }}
              onFocus={() => setItemDropdownOpen(true)}
              placeholder="Item name / Barcode / Itemcode"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
            />
            {itemDropdownOpen && itemSearch && filteredProducts.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {filteredProducts.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => addItemFromProduct(p)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.item_name}</p>
                      {p.item_code && <p className="text-xs text-slate-400">Code: {p.item_code}</p>}
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                      {formatMoney(p.sales_price || p.purchase_price || 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e6fa8] text-white hover:bg-[#1a5f90]"
            title="Add row"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* ─── Items Table ─── */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-[#1e6fa8] text-left text-xs font-semibold text-white">
                <th className="px-3 py-2.5 w-6">#</th>
                <th className="px-3 py-2.5">Item Name</th>
                <th className="px-3 py-2.5 w-24 text-center">Quantity</th>
                <th className="px-3 py-2.5 w-28 text-right">Purchase Price(₹)</th>
                <th className="px-3 py-2.5 w-24 text-right">Discount(₹)</th>
                <th className="px-3 py-2.5 w-24 text-right">Tax Amount</th>
                <th className="px-3 py-2.5 w-24 text-right">Unit Cost</th>
                <th className="px-3 py-2.5 w-28 text-right">Total Amount</th>
                <th className="px-3 py-2.5 w-12">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      placeholder="Item description"
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-[#1e6fa8] focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {/* ✅ QUANTITY - With increment/decrement + no leading zero */}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cleanVal = val.replace(/^0+/, '');
                        if (cleanVal === '' || /^\d+$/.test(cleanVal)) {
                          updateItem(idx, { quantity: cleanVal === '' ? 0 : parseFloat(cleanVal) });
                        }
                      }}
                      onBlur={() => {
                        if (!item.quantity || item.quantity === 0) {
                          updateItem(idx, { quantity: 1 });
                        }
                      }}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-center focus:border-[#1e6fa8] focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {/* ✅ PURCHASE PRICE - With increment/decrement + no leading zero */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.purchase_price === 0 ? '' : item.purchase_price}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cleanVal = val.replace(/^0+/, '');
                        if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
                          updateItem(idx, { purchase_price: cleanVal === '' ? 0 : parseFloat(cleanVal) });
                        }
                      }}
                      onBlur={() => {
                        if (!item.purchase_price) {
                          updateItem(idx, { purchase_price: 0 });
                        }
                      }}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-right focus:border-[#1e6fa8] focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {/* ✅ DISCOUNT - With increment/decrement + no leading zero */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.discount === 0 ? '' : item.discount}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cleanVal = val.replace(/^0+/, '');
                        if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
                          updateItem(idx, { discount: cleanVal === '' ? 0 : parseFloat(cleanVal) });
                        }
                      }}
                      onBlur={() => {
                        if (!item.discount) {
                          updateItem(idx, { discount: 0 });
                        }
                      }}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-right focus:border-[#1e6fa8] focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {/* ✅ TAX AMOUNT - With increment/decrement + no leading zero */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.tax_amount === 0 ? '' : item.tax_amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cleanVal = val.replace(/^0+/, '');
                        if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
                          updateItem(idx, { tax_amount: cleanVal === '' ? 0 : parseFloat(cleanVal) });
                        }
                      }}
                      onBlur={() => {
                        if (!item.tax_amount) {
                          updateItem(idx, { tax_amount: 0 });
                        }
                      }}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-right focus:border-[#1e6fa8] focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600 text-xs font-mono">
                    ₹{(item.unit_cost ?? 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800 text-xs font-mono">
                    ₹{calcLineTotal(item).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Footer Section ─── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left: totals inputs */}
          <div className="space-y-4">
            {/* Total quantities */}
            <div className="flex items-center gap-4">
              <label className="w-36 flex-shrink-0 text-sm font-semibold text-slate-700">
                Total Quantities
              </label>
              <span className="text-lg font-bold text-slate-800">{totalQty.toFixed(2)}</span>
            </div>

            {/* Other Charges */}
            <div className="flex items-center gap-3">
              <label className="w-36 flex-shrink-0 text-sm font-semibold text-slate-700">
                Other Charges
              </label>
              {/* ✅ OTHER CHARGES - With increment/decrement + no leading zero */}
              <input
                type="number"
                min="0"
                step="0.01"
                value={otherCharges === 0 ? '' : otherCharges}
                onChange={(e) => {
                  const val = e.target.value;
                  const cleanVal = val.replace(/^0+/, '');
                  if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
                    setOtherCharges(cleanVal === '' ? 0 : parseFloat(cleanVal));
                  }
                }}
                onBlur={() => {
                  if (!otherCharges) {
                    setOtherCharges(0);
                  }
                }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
              />
              <select
                value={otherChargesType}
                onChange={(e) => setOtherChargesType(e.target.value)}
                className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
              >
                <option value="">-Select-</option>
                {OTHER_CHARGE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Discount on All */}
            <div className="flex items-center gap-3">
              <label className="w-36 flex-shrink-0 text-sm font-semibold text-slate-700">
                Discount on All
              </label>
              {/* ✅ DISCOUNT ON ALL - With increment/decrement + no leading zero */}
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountOnAll === 0 ? '' : discountOnAll}
                onChange={(e) => {
                  const val = e.target.value;
                  const cleanVal = val.replace(/^0+/, '');
                  if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
                    setDiscountOnAll(cleanVal === '' ? 0 : parseFloat(cleanVal));
                  }
                }}
                onBlur={() => {
                  if (!discountOnAll) {
                    setDiscountOnAll(0);
                  }
                }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
              />
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
                className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none"
              >
                <option value="flat">Flat</option>
                <option value="percent">Percent</option>
              </select>
            </div>

            {/* Note */}
            <div className="flex items-start gap-3">
              <label className="w-36 flex-shrink-0 pt-1 text-sm font-semibold text-slate-700">
                Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Additional notes…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Right: summary */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <SummaryRow label="Subtotal" value={subtotal} />
            <SummaryRow label="Other Charges" value={otherTotal} />
            <SummaryRow label="Discount on All" value={discountTotal} negative />
            <SummaryRow
              label={
                <span className="flex items-center gap-1">
                  Round Off <AlertCircle size={13} className="text-slate-400" />
                </span>
              }
              value={roundOff}
            />
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-800">Grand Total</span>
                <span className="text-xl font-bold text-[#1e6fa8]">{formatMoney(grandTotal)}</span>
              </div>
            </div>

            {/* Live payment info — edit mode only */}
            {editMode && (
              <div className="border-t border-dashed border-slate-200 pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-semibold text-emerald-600">{formatMoney(amountPaid)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Balance Due</span>
                  <span className="font-semibold text-red-500">{formatMoney(Math.max(0, grandTotal - amountPaid))}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Payment Status</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                    paymentStatus === "paid"    ? "bg-emerald-100 text-emerald-700" :
                    paymentStatus === "partial" ? "bg-amber-100 text-amber-700" :
                                                  "bg-red-100 text-red-700"
                  }`}>{paymentStatus}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Previous Payments ─── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-700">Previous Payments Information :</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="bg-[#1e6fa8] text-left text-xs font-semibold text-white">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Payment Type</th>
                <th className="px-4 py-2.5">Payment Note</th>
                <th className="px-4 py-2.5 text-right">Payment</th>
                <th className="px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {existingPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-amber-500 font-medium">
                    Payments Pending‼
                  </td>
                </tr>
              ) : (
                existingPayments.map((p, idx) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-2.5 capitalize font-medium text-slate-700">
                      {p.payment_type}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{p.payment_note || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                      {formatMoney(p.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <DemoGuard>
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          disabled={deletingPaymentId === p.id}
                          className="text-red-400 hover:text-red-600 disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </DemoGuard>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Make Payment ─── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-700">Make Payment :</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Amount</label>
            {/* ✅ PAYMENT AMOUNT - With increment/decrement + no leading zero */}
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount === 0 ? '' : paymentAmount}
              onChange={(e) => {
                const val = e.target.value;
                const cleanVal = val.replace(/^0+/, '');
                if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
                  setPaymentAmount(cleanVal === '' ? 0 : parseFloat(cleanVal));
                }
              }}
              onBlur={() => {
                if (!paymentAmount) {
                  setPaymentAmount(0);
                }
              }}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Payment Type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PurchasePaymentType)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
            >
              <option value="">-Select-</option>
              {PAYMENT_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Account</label>
            <input
              value={paymentAccount}
              onChange={(e) => setPaymentAccount(e.target.value)}
              placeholder="-None-"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
            />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Payment Note</label>
          <textarea
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            rows={2}
            placeholder="Payment note…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8] resize-none"
          />
        </div>

        {/* Add payment button (edit mode only) */}
        {editMode && (
          <button
            type="button"
            onClick={handleAddPayment}
            disabled={addingPayment || paymentAmount <= 0}
            className="mt-3 rounded-lg bg-[#1e6fa8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a5f90] disabled:opacity-40"
          >
            {addingPayment ? "Recording…" : "Record Payment"}
          </button>
        )}
      </div>

      {/* ─── Action Buttons ─── */}
      <div className="flex items-center justify-center gap-4 pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="min-w-40 rounded-lg bg-emerald-500 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/purchase/list")}
          className="min-w-40 rounded-lg bg-amber-500 px-8 py-3 text-sm font-bold text-white hover:bg-amber-600 transition-colors shadow-sm"
        >
          Close
        </button>
      </div>

      {/* ─── Purchase Receipt Modal (shown after successful create) ─── */}
      {createdPurchase && (
        <PurchaseReceiptModal
          purchase={createdPurchase}
          onClose={() => {
            setCreatedPurchase(null);
            navigate("/purchase/list");
          }}
        />
      )}
    </div>
  );
}


// -------------------------------------------------------------------
// Summary Row helper
// -------------------------------------------------------------------
function SummaryRow({
  label,
  value,
  negative = false,
}: {
  label: React.ReactNode;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold ${negative ? "text-red-500" : "text-slate-800"}`}>
        {negative && value > 0 ? "-" : ""}
        {formatMoney(Math.abs(value))}
      </span>
    </div>
  );
}