import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Search, X, UserPlus, PauseCircle, Layers, Banknote, Wallet } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/ui/Modal";
import { useCustomers, useCreateCustomer } from "../hooks/useCustomers";
import { useItems } from "../hooks/useItems";
import { fetchItems } from "../api/items";
import { createInvoice } from "../api/invoices";
import { formatMoney } from "../utils/format";
import type { InvoiceItem } from "../types";
import type { Item } from "../api/items";
import { useTranslation } from "../context/LanguageContext";
import { CouponInput } from "../components/coupons/CouponInput";
import { useBranch } from "../context/BranchContext";

const defaultCartItem = { description: "", quantity: 1, unit_price: 0, tax_rate: 0 };

export function POSPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();
  const [productSearch, setProductSearch] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });

  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const { data: itemsData, isLoading: productsLoading } = useItems({ page: 1, per_page: 100, search: productSearch });
  const { data: customersData, isLoading: customersLoading } = useCustomers({ page: 1, search: customerSearch });
  const createCustomerMutation = useCreateCustomer();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createSale = useMutation({
    mutationFn: createInvoice,
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`${t("Sale")} ${invoice.invoice_number} ${t("saved")}`);
      setCartItems([]);
      setAppliedCoupon(null);
      setCouponDiscount(0);
      navigate(`/sales/${invoice.id}`);
    },
    onError: () => {
      toast.error(t("Could not complete the sale. Please check the cart and try again."));
    },
  });

  const walkInCustomer = useMemo(
    () => customersData?.items?.find((customer) => customer.name === "Walk-in customer"),
    [customersData]
  );

  useEffect(() => {
    if (!selectedCustomerId && walkInCustomer) {
      setSelectedCustomerId(walkInCustomer.id);
    }
  }, [walkInCustomer, selectedCustomerId]);

  const cartTotals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const tax = cartItems.reduce((sum, item) => sum + item.quantity * item.unit_price * (item.tax_rate / 100), 0);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [cartItems]);

  const handleAddProduct = (product: Item) => {
    setCartItems((current) => {
      const existingIndex = current.findIndex((item) => item.product_id === product.id);
      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...current,
        {
          product_id: product.id,
          description: product.item_name,
          quantity: 1,
          unit_price: product.sales_price ?? product.unit_price ?? 0,
          tax_rate: 0,
        },
      ];
    });
  };

  // Keeps the search box focused so a barcode scanner (which just types into
  // whatever's focused, then sends Enter) always has somewhere to type.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // A scanner "types" the barcode then sends Enter -- this is what turns
  // that into an instant, hands-free add to the cart. Does its own exact-match
  // lookup (not the debounced fuzzy list already on screen) so a fast scan
  // can't race ahead of the still-updating search results and miss.
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const code = productSearch.trim();
    if (!code || isScanning) return;

    setIsScanning(true);
    try {
      const result = await fetchItems({ search: code, per_page: 20 });
      const normalized = code.toLowerCase();
      const match = result.items.find(
        (item) =>
          item.barcode?.toLowerCase() === normalized ||
          item.item_code?.toLowerCase() === normalized ||
          item.sku?.toLowerCase() === normalized
      );

      if (match) {
        handleAddProduct(match);
        setProductSearch("");
      } else {
        toast.error(t("No product found for that code"));
      }
    } catch {
      toast.error(t("Couldn't look up that code. Please try again."));
    } finally {
      setIsScanning(false);
      searchInputRef.current?.focus();
    }
  };

  const updateCartItem = (index: number, patch: Partial<InvoiceItem>) => {
    setCartItems((current) =>
      current.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const removeCartItem = (index: number) => {
    setCartItems((current) => current.filter((_, idx) => idx !== index));
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) return;
    try {
      const created = await createCustomerMutation.mutateAsync({
        name: newCustomer.name.trim(),
        email: newCustomer.email.trim() || null,
        phone: newCustomer.phone.trim() || null,
      });
      setSelectedCustomerId(created.id);
      setNewCustomer({ name: "", email: "", phone: "" });
      setShowCustomerModal(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch {
      // handled by toast
    }
  };

  const resolveCustomerId = async () => {
    if (selectedCustomerId && selectedCustomerId !== 0) {
      return selectedCustomerId;
    }
    if (walkInCustomer) {
      return walkInCustomer.id;
    }
    const created = await createCustomerMutation.mutateAsync({
      name: "Walk-in customer",
      email: null,
      phone: null,
    });
    return created.id;
  };

  const handleCheckout = async (status: "draft" | "pending" | "paid") => {
    if (cartItems.length === 0) {
      toast.error(t("Add at least one item to the cart."));
      return;
    }
    const customer_id = await resolveCustomerId();
    createSale.mutate({
      customer_id,
      status,
      items: cartItems,
      discount_type: "flat",
      discount_value: 0,
      coupon_code: appliedCoupon?.code || null,
      coupon_discount: couponDiscount,
      notes: null,
      branch_id: currentBranchId || undefined,
    });
  };

  const handleCouponApplied = (coupon: any, discount: number) => {
    setAppliedCoupon(coupon);
    setCouponDiscount(discount);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t("POS")}</h1>
          <p className="text-sm text-slate-500">{t("Create a point-of-sale sale quickly with product cards and cart totals.")}</p>
        </div>
        <button
          onClick={() => setShowCustomerModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <UserPlus size={16} />
          {t("Add customer")}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          {/* Product search & customer select */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("Product search")}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t("Search or scan barcode...")}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-ink-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("Customer")}
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(Number(e.target.value) || "")}
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 px-3 text-sm text-ink-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">{t("Walk-in customer")}</option>
                  {customersData?.items?.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink-900">{t("Cart")}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                {cartItems.length} {t("items")}
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                {t("Add products to the cart to start the sale.")}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t("Item")}</th>
                      <th className="w-24 px-3 py-3">{t("Qty")}</th>
                      <th className="w-28 px-3 py-3">{t("Price")}</th>
                      <th className="w-24 px-3 py-3">{t("Tax %")}</th>
                      <th className="w-32 px-4 py-3 text-right">{t("Total")}</th>
                      <th className="w-12 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item, index) => {
                      const lineSubtotal = item.quantity * item.unit_price;
                      const lineTax = lineSubtotal * (item.tax_rate / 100);
                      return (
                        <tr key={index} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 text-sm text-ink-900">{item.description}</td>
                          <td className="px-3 py-3">
                            {/* ✅ FIX: Quantity - Empty by default, no leading zeros */}
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+/, '');
                                if (val === '' || /^\d*$/.test(val)) {
                                  const numVal = val === '' ? 0 : parseInt(val);
                                  updateCartItem(index, { quantity: numVal });
                                }
                              }}
                              onBlur={() => {
                                if (!item.quantity || item.quantity <= 0) {
                                  updateCartItem(index, { quantity: 1 });
                                }
                              }}
                              className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand"
                              placeholder="1"
                            />
                          </td>
                          <td className="px-3 py-3">
                            {/* ✅ FIX: Price - Empty by default, no leading zeros */}
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              value={item.unit_price === 0 ? '' : item.unit_price}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+/, '');
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  const numVal = val === '' ? 0 : parseFloat(val);
                                  updateCartItem(index, { unit_price: numVal });
                                }
                              }}
                              onBlur={() => {
                                if (!item.unit_price) {
                                  updateCartItem(index, { unit_price: 0 });
                                }
                              }}
                              className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-3 py-3">
                            {/* ✅ FIX: Tax % - Empty by default, no leading zeros */}
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              value={item.tax_rate === 0 ? '' : item.tax_rate}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+/, '');
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  const numVal = val === '' ? 0 : parseFloat(val);
                                  updateCartItem(index, { tax_rate: numVal });
                                }
                              }}
                              onBlur={() => {
                                if (!item.tax_rate) {
                                  updateCartItem(index, { tax_rate: 0 });
                                }
                              }}
                              className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand"
                              placeholder="0"
                            />
                          </td>
                          <td className="figures px-4 py-3 text-right font-medium text-ink-900">
                            {formatMoney(lineSubtotal + lineTax)}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeCartItem(index)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-danger-light hover:text-danger"
                              aria-label={t("Remove item")}
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Checkout buttons */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => handleCheckout("draft")}
              disabled={createSale.isPending}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PauseCircle size={16} />
              {createSale.isPending ? t("Saving…") : t("Hold")}
            </button>
            <button
              type="button"
              onClick={() => handleCheckout("pending")}
              disabled={createSale.isPending}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Layers size={16} />
              {createSale.isPending ? t("Saving…") : t("Multiple")}
            </button>
            <button
              type="button"
              onClick={() => handleCheckout("paid")}
              disabled={createSale.isPending}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Banknote size={16} />
              {createSale.isPending ? t("Processing…") : t("Cash")}
            </button>
            <button
              type="button"
              onClick={() => handleCheckout("paid")}
              disabled={createSale.isPending}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wallet size={16} />
              {createSale.isPending ? t("Processing…") : t("Pay All")}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{t("Total")}</h2>
                <p className="text-sm text-slate-500">{t("Review the order before checkout.")}</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                {cartItems.length} {t("items")}
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{t("Subtotal")}</span>
                <span>{formatMoney(cartTotals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{t("Tax")}</span>
                <span>{formatMoney(cartTotals.tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base font-semibold text-ink-900">
                <span>{t("Grand total")}</span>
                <span>{formatMoney(cartTotals.total - couponDiscount)}</span>
              </div>
            </div>
          </div>

          {/* Coupon Input */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Coupon")}</label>
            <CouponInput
              customerId={selectedCustomerId || null}
              subtotal={cartTotals.subtotal}
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              initialCode={appliedCoupon?.code || ""}
            />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <h2 className="text-lg font-semibold text-ink-900">{t("Products")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(productsLoading
                ? Array.from({ length: 4 }).map((_, i) => ({ id: i, skeleton: true }))
                : (itemsData?.items ?? [])
              ).map((product, index) => {
                const isSkeleton = (product as any).skeleton;
                return (
                  <div
                    key={isSkeleton ? index : (product as Item).id}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand/50 hover:bg-white"
                  >
                    {isSkeleton ? (
                      <div className="h-28 animate-pulse rounded-xl bg-slate-200" />
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink-900">{(product as Item).item_name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {(product as Item).opening_stock} {t("available")}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                            {formatMoney((product as Item).sales_price ?? (product as Item).unit_price ?? 0)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddProduct(product as Item)}
                          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                        >
                          <Plus size={16} />
                          {t("Add")}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} title={t("Add customer")}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Name")}</label>
            <input
              value={newCustomer.name}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t("Customer name")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Email")}</label>
            <input
              value={newCustomer.email}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
              placeholder={t("Email (optional)")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Phone")}</label>
            <input
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder={t("Phone (optional)")}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCustomerModal(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              {t("Cancel")}
            </button>
            <button
              type="button"
              onClick={handleCreateCustomer}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              {t("Save customer")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}