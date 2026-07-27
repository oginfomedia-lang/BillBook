import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Trash2, ChevronDown, AlertCircle, Percent, Tag } from 'lucide-react';
import { useItems } from "../../hooks/useItems";
import { useCustomers } from "../../hooks/useCustomers";
import type { Customer } from "../../types";
import type { Item } from "../../api/items";
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useBranch } from '../../context/BranchContext';

const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface SaleItem {
  id: string;
  item_id: number;
  item_code: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  tax_percent: number;
  amount: number;
  max_stock?: number;
}

interface AddSaleFormData {
  customer_id: number | '';
  issue_date: string;
  due_date: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  notes: string;
  coupon_code: string;
  items: SaleItem[];
}

export function AddSalePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBranchId } = useBranch();

  // Product search state
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Item[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Fetch items
  const { data: itemsData, isLoading: productsLoading } = useItems({
    page: 1,
    per_page: 1000,
  });
  const allProducts = itemsData?.items ?? [];

  // Fetch customers
  const { data: customersData } = useCustomers({ page: 1 });
  const customers = customersData?.items || [];

  // Form state
  const [formData, setFormData] = useState<AddSaleFormData>({
    customer_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    discount_type: 'percentage',
    discount_value: 0,
    notes: '',
    coupon_code: '',
    items: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ FIX: Use useMemo to prevent infinite loop
  const filteredItems = useMemo(() => {
    if (!productSearch.trim()) {
      return [];
    }
    return allProducts.filter(
      (product) =>
        (product.item_code && product.item_code.toLowerCase().includes(productSearch.toLowerCase())) ||
        product.item_name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase()))
    );
  }, [productSearch, allProducts]);

  // ✅ Update filtered products
  useEffect(() => {
    if (productSearch.trim()) {
      setFilteredProducts(filteredItems);
      setShowProductDropdown(true);
    } else {
      setFilteredProducts([]);
      setShowProductDropdown(false);
    }
  }, [filteredItems, productSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;

    formData.items.forEach((item) => {
      const amount = item.unit_price * item.quantity;
      subtotal += amount;
      taxTotal += (amount * item.tax_percent) / 100;
    });

    let discountAmount = 0;
    if (formData.discount_value > 0) {
      if (formData.discount_type === 'percentage') {
        discountAmount = (subtotal * formData.discount_value) / 100;
      } else {
        discountAmount = formData.discount_value;
      }
    }

    if (couponDiscountAmount > 0) {
      discountAmount += couponDiscountAmount;
    }

    const total = subtotal + taxTotal - discountAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total: Math.max(0, Math.round(total * 100) / 100),
    };
  };

  // Add product to items
  const handleSelectProduct = (product: Item) => {
    const existingItem = formData.items.find((item) => item.item_id === product.id);

    if (existingItem) {
      const availableStock = product.opening_stock || 0;
      if (existingItem.quantity + 1 > availableStock) {
        toast.error(`⚠️ Only ${availableStock} pcs available in stock.`);
        return;
      }

      const updatedItems = formData.items.map((item) => {
        if (item.id === existingItem.id) {
          const newQty = item.quantity + 1;
          const newAmount = item.unit_price * newQty;
          return { ...item, quantity: newQty, amount: newAmount };
        }
        return item;
      });

      setFormData((prev) => ({
        ...prev,
        items: updatedItems,
      }));

      setProductSearch('');
      setShowProductDropdown(false);
      setFilteredProducts([]);
      toast.success(`Added 1 more ${product.item_name}`);
      return;
    }

    const availableStock = product.opening_stock || 0;
    if (availableStock <= 0) {
      toast.error(`⚠️ ${product.item_name} is out of stock!`);
      return;
    }

    const newItem: SaleItem = {
      id: `${product.id}-${Date.now()}`,
      item_id: product.id,
      item_code: product.item_code || '',
      item_name: product.item_name,
      unit_price: product.unit_price || product.sales_price || 0,
      quantity: 1,
      tax_percent: product.tax?.tax_value || 0,
      amount: product.unit_price || product.sales_price || 0,
      max_stock: availableStock,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setProductSearch('');
    setShowProductDropdown(false);
    setFilteredProducts([]);
    setErrors((prev) => ({ ...prev, product: '' }));
    toast.success(`✅ ${product.item_name} added to sale`);
  };

  // Update item quantity or price
  const handleUpdateItem = (
    id: string,
    field: 'quantity' | 'unit_price' | 'tax_percent',
    value: number
  ) => {
    if (field === 'quantity') {
      const item = formData.items.find(i => i.id === id);
      if (item) {
        const product = allProducts.find(p => p.id === item.item_id);
        if (product) {
          const availableStock = product.opening_stock || 0;
          if (value > availableStock) {
            toast.error(`⚠️ Only ${availableStock} pcs available in stock.`);
            return;
          }
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          updated.amount = updated.unit_price * updated.quantity;
          return updated;
        }
        return item;
      }),
    }));
  };

  // Remove item from list
  const handleRemoveItem = (id: string) => {
    const item = formData.items.find(i => i.id === id);
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    if (item) {
      toast.success(`Removed ${item.item_name} from sale`);
    }
  };

  // Apply Coupon Handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    if (appliedCoupon) {
      toast.error('A coupon is already applied');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const subtotal = calculateTotals().subtotal;

      const response = await api.post('/coupons/validate', {
        code: couponCode,
        subtotal: subtotal,
        customer_id: formData.customer_id || undefined
      });

      if (response.data.valid) {
        const { coupon, discount } = response.data;

        setAppliedCoupon(coupon);
        setCouponDiscountAmount(discount.amount);

        setFormData(prev => ({
          ...prev,
          coupon_code: coupon.code,
          discount_type: discount.type,
          discount_value: discount.value
        }));

        toast.success(`✅ Coupon ${coupon.code} applied!`);
        setCouponCode('');
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || 'Invalid coupon code';
      toast.error(errorMsg);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Remove Coupon Handler
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscountAmount(0);
    setFormData(prev => ({
      ...prev,
      coupon_code: '',
      discount_type: 'percentage',
      discount_value: 0
    }));
    toast.success('Coupon removed');
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) {
      newErrors.customer_id = 'Please select a customer';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one product';
    }

    if (!formData.issue_date) {
      newErrors.issue_date = 'Issue date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (status: 'draft' | 'pending') => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const totals = calculateTotals();

      const payload = {
        customer_id: formData.customer_id,
        issue_date: formData.issue_date,
        due_date: formData.due_date || null,
        discount_type: formData.discount_type === 'percentage' ? 'percent' : 'flat',
        discount_value: formData.discount_value,
        notes: formData.notes || null,
        coupon_code: appliedCoupon?.code || null,
        coupon_discount: couponDiscountAmount,
        status: status,
        branch_id: currentBranchId || undefined,
        items: formData.items.map((item) => ({
          product_id: item.item_id,
          description: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_percent,
        })),
      };

      console.log('Sale payload:', payload);
      const response = await api.post('/invoices', payload);
      console.log('Sale response:', response.data);

      toast.success(status === 'draft' ? '✅ Sale saved as draft!' : '✅ Sale created successfully!');
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      navigate('/sales');
    } catch (error: any) {
      console.error('Error creating sale:', error);
      let errorMsg = error?.response?.data?.error || 'Failed to create sale. Please try again.';
      if (error?.response?.data?.details) {
        errorMsg += ': ' + JSON.stringify(error.response.data.details);
      }
      toast.error(`❌ ${errorMsg}`);
      setErrors((prev) => ({
        ...prev,
        submit: errorMsg,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();
  const isFormValid = formData.customer_id && formData.items.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Add Sale</h2>
          <p className="text-sm text-slate-500">Create a sales invoice for the POS flow or customer billing.</p>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Customer and Dates */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Customer</label>
              <select
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer_id: e.target.value ? parseInt(e.target.value) : '',
                  }))
                }
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand ${errors.customer_id ? 'border-red-300' : 'border-slate-200'
                  }`}
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="mt-1 text-xs text-red-500">{errors.customer_id}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Issue date</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      issue_date: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Due date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      due_date: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-2 pr-2 min-w-[200px]">Product</th>
                    <th className="pb-2 pr-2 w-20">Qty</th>
                    <th className="pb-2 pr-2 w-28">Unit Price</th>
                    <th className="pb-2 pr-2 w-20">Tax %</th>
                    <th className="pb-2 pr-2 w-28 text-right">Amount</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.length > 0 ? (
                    formData.items.map((item) => {
                      const product = allProducts.find(p => p.id === item.item_id);
                      const availableStock = product?.opening_stock || 0;
                      const isLowStock = item.quantity >= availableStock;

                      return (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-2">
                            <div className="font-medium text-slate-800">{item.item_name}</div>
                            <div className="text-xs text-slate-400">
                              {item.item_code}
                              {isLowStock && (
                                <span className="ml-2 text-amber-600 font-medium">
                                  ⚠️ Only {availableStock} left
                                </span>
                              )}
                            </div>
                          </td>
                          {/* ✅ FIX: Quantity - Empty by default */}
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+/, '');
                                if (val === '' || /^\d*$/.test(val)) {
                                  const numVal = val === '' ? 0 : parseInt(val);
                                  handleUpdateItem(item.id, 'quantity', numVal);
                                }
                              }}
                              onBlur={() => {
                                if (!item.quantity || item.quantity <= 0) {
                                  handleUpdateItem(item.id, 'quantity', 1);
                                }
                              }}
                              className={`w-full rounded-md border px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 ${item.quantity > availableStock
                                ? 'border-red-400 focus:ring-red-500 bg-red-50'
                                : 'border-slate-200 focus:ring-brand'
                                }`}
                              placeholder="1"
                            />
                            {item.quantity > 0 && (
                              <div className="mt-1 text-[10px] text-slate-400 text-center">
                                Max: {availableStock}
                              </div>
                            )}
                          </td>
                          {/* ✅ FIX: Unit Price - Empty by default */}
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              value={item.unit_price === 0 ? '' : item.unit_price}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+/, '');
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  const numVal = val === '' ? 0 : parseFloat(val);
                                  handleUpdateItem(item.id, 'unit_price', numVal);
                                }
                              }}
                              onBlur={() => {
                                if (!item.unit_price) {
                                  handleUpdateItem(item.id, 'unit_price', 0);
                                }
                              }}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand"
                              placeholder="0.00"
                            />
                          </td>
                          {/* ✅ FIX: Tax % - Empty by default */}
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              value={item.tax_percent === 0 ? '' : item.tax_percent}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+/, '');
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  const numVal = val === '' ? 0 : parseFloat(val);
                                  handleUpdateItem(item.id, 'tax_percent', numVal);
                                }
                              }}
                              onBlur={() => {
                                if (!item.tax_percent) {
                                  handleUpdateItem(item.id, 'tax_percent', 0);
                                }
                              }}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 pr-2 text-right font-semibold text-slate-700">
                            {formatMoney(item.amount)}
                          </td>
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Remove item"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                        {errors.items ? (
                          <span className="text-red-500">{errors.items}</span>
                        ) : (
                          'No products added yet. Search and select products above.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Product Search */}
            <div className="relative mt-4" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onFocus={() => productSearch && setShowProductDropdown(true)}
                  placeholder="Search product by name, code, or SKU..."
                  className={`w-full rounded-md border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand ${errors.product ? 'border-red-300' : 'border-slate-200'
                    }`}
                />
              </div>

              {/* Product Dropdown */}
              {showProductDropdown && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {productsLoading ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Loading products...</div>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => {
                      const stock = product.opening_stock || 0;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className={`flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 last:border-0 ${stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          disabled={stock <= 0}
                        >
                          <div>
                            <div className="font-medium text-slate-800">{product.item_name}</div>
                            <div className="text-xs text-slate-400">Code: {product.item_code}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-brand">{formatMoney(product.unit_price || 0)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${stock > 10
                              ? 'bg-green-100 text-green-700'
                              : stock > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                              }`}>
                              {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : productSearch ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No products found</div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-500">Start typing to search products</div>
                  )}
                </div>
              )}
              {errors.product && (
                <p className="mt-1 text-xs text-red-500">{errors.product}</p>
              )}
            </div>

            {/* Add line item button */}
            <button
              type="button"
              onClick={() => {
                searchInputRef.current?.focus();
                setProductSearch('');
              }}
              className="mt-3 flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-dark transition-colors"
            >
              <span className="text-lg leading-none">+</span> Add line item
            </button>
          </div>

          {/* Coupon */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Coupon</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="ENTER COUPON CODE"
                  disabled={!!appliedCoupon || isApplyingCoupon}
                  className={`w-full rounded-md border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand uppercase ${appliedCoupon ? 'bg-green-50 border-green-300 text-green-700' : 'border-slate-200'
                    }`}
                />
              </div>
              {!appliedCoupon ? (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isApplyingCoupon ? 'Checking...' : 'Apply'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-semibold hover:bg-red-600 transition-colors whitespace-nowrap"
                >
                  Remove
                </button>
              )}
            </div>
            {appliedCoupon && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  ✅ Coupon <strong>{appliedCoupon.code}</strong> applied!
                  {appliedCoupon.type === 'percentage'
                    ? ` ${appliedCoupon.value}% off`
                    : ` ₹${appliedCoupon.value} off`}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              rows={3}
              placeholder="Payment terms, thank-you note, etc."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
            />
          </div>
        </form>
      </div>

      {/* Right Sidebar */}
      <div className="space-y-4">
        {/* Summary */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium text-ink-900">{formatMoney(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Tax</span>
            <span className="font-medium text-ink-900">{formatMoney(totals.taxTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Discount</span>
            <span className="font-medium text-red-500">-{formatMoney(totals.discountAmount)}</span>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <div className="flex justify-between">
              <span className="font-semibold text-ink-900">Total</span>
              <span className="text-lg font-bold text-brand">{formatMoney(totals.total)}</span>
            </div>
          </div>

          {/* Discount Controls */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Discount Type</label>
              <select
                value={formData.discount_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discount_type: e.target.value as 'percentage' | 'fixed',
                  }))
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={!!appliedCoupon}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Discount Value</label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={formData.discount_value === 0 ? '' : formData.discount_value}
                onChange={(e) => {
                  const val = e.target.value.replace(/^0+/, '');
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setFormData(prev => ({
                      ...prev,
                      discount_value: val === '' ? 0 : parseFloat(val)
                    }));
                  }
                }}
                onBlur={() => {
                  if (!formData.discount_value) {
                    setFormData(prev => ({ ...prev, discount_value: 0 }));
                  }
                }}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="0.00"
                disabled={!!appliedCoupon}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid gap-2">
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit('pending');
            }}
            disabled={!isFormValid || isSubmitting}
            className={`w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors ${isFormValid && !isSubmitting
              ? 'bg-brand hover:bg-brand-dark'
              : 'bg-slate-300 cursor-not-allowed'
              }`}
          >
            {isSubmitting ? 'Creating...' : 'Create & Send'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit('draft');
            }}
            disabled={!isFormValid || isSubmitting}
            className={`w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-ink-700 hover:bg-slate-50 transition-colors ${
              !isFormValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Save as Draft
          </button>
        </div>

        {/* Validation Errors */}
        {!isFormValid && (
          <div className="mt-2 text-xs text-amber-600 space-y-1">
            {!formData.customer_id && <p>• Please select a customer</p>}
            {formData.items.length === 0 && <p>• Please add at least one product</p>}
          </div>
        )}
      </div>
    </div>
  );
}