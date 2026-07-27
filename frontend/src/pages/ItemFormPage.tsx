import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import {
    useItem, useCreateItem, useUpdateItem,
    useCategories, useCreateCategory,
    useBrands, useCreateBrand,
    useUnits, useCreateUnit,
    useTaxes, useCreateTax
} from '../hooks/useItems';
import { useWarehouses } from '../hooks/useWarehouses';
import type { CreateItemInput, UpdateItemInput, ItemType } from '../api/items';
import toast from 'react-hot-toast';

interface ItemFormPageProps {
    isService?: boolean;
}

export function ItemFormPage({ isService: routeIsService = false }: ItemFormPageProps) {
    const navigate = useNavigate();
    const { itemId } = useParams<{ itemId?: string }>();
    const isEdit = Boolean(itemId);

    const { data: editingItem, isLoading: itemLoading } = useItem(Number(itemId), {
        enabled: isEdit,
    });

    const createItem = useCreateItem();
    const updateItem = useUpdateItem();

    // Dropdowns
    const { data: categories = [] } = useCategories();
    const { data: brands = [] } = useBrands();
    const { data: units = [] } = useUnits();
    const { data: taxes = [] } = useTaxes();
    const { data: warehouseData } = useWarehouses({ per_page: 100 });
    const warehouses = warehouseData?.items ?? [];

    // Inline Creators
    const createCategoryMutation = useCreateCategory();
    const createBrandMutation = useCreateBrand();
    const createUnitMutation = useCreateUnit();
    const createTaxMutation = useCreateTax();

    // Inline creation modal states
    const [catModal, setCatModal] = useState({ open: false, name: '', desc: '' });
    const [brandModal, setBrandModal] = useState({ open: false, name: '', desc: '' });
    const [unitModal, setUnitModal] = useState({ open: false, name: '', shortName: '' });
    const [taxModal, setTaxModal] = useState({ open: false, name: '', value: 0 });

    const [form, setForm] = useState<CreateItemInput>({
        item_code: '',
        item_name: '',
        sales_price: 0,
        purchase_price: 0,
        price_expenses: 0,
        opening_stock: 0,
        alert_quantity: 0,
        seller_points: 0,
        discount_type: 'percentage',
        discount_value: 0,
        tax_type: 'inclusive',
        status: 'active',
        type: routeIsService ? 'service' : 'item',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [profitMargin, setProfitMargin] = useState(0);

    // Auto-generate code if empty
    useEffect(() => {
        if (!isEdit && !form.item_code) {
            const prefix = form.type === 'service' ? 'SRV' : 'IT';
            const randomNum = Math.floor(100000 + Math.random() * 900000);
            setForm((f) => ({ ...f, item_code: `${prefix}${randomNum}` }));
        }
    }, [form.type, isEdit]);

    // Load data when editing
    useEffect(() => {
        if (isEdit && editingItem) {
            setForm({
                item_code: editingItem.item_code,
                item_name: editingItem.item_name,
                item_group_id: editingItem.item_group_id,
                category_id: editingItem.category_id,
                brand_id: editingItem.brand_id,
                unit_id: editingItem.unit_id,
                sku: editingItem.sku,
                hsn: editingItem.hsn,
                sac: editingItem.sac,
                barcode: editingItem.barcode,
                description: editingItem.description,
                image_url: editingItem.image_url,
                price_expenses: editingItem.price_expenses,
                purchase_price: editingItem.purchase_price,
                sales_price: editingItem.sales_price,
                mrp: editingItem.mrp,
                discount_type: editingItem.discount_type,
                discount_value: editingItem.discount_value,
                tax_id: editingItem.tax_id,
                tax_type: editingItem.tax_type,
                opening_stock: editingItem.opening_stock,
                alert_quantity: editingItem.alert_quantity,
                warehouse_id: editingItem.warehouse_id,
                seller_points: editingItem.seller_points,
                status: editingItem.status,
                type: editingItem.type || 'item',
            });
        }
    }, [editingItem, isEdit]);

    // Calculate profit margin
    useEffect(() => {
        if (form.purchase_price && form.purchase_price > 0) {
            const margin = ((form.sales_price - form.purchase_price) / form.purchase_price) * 100;
            setProfitMargin(Math.round(margin * 100) / 100);
        } else {
            setProfitMargin(0);
        }
    }, [form.sales_price, form.purchase_price]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!form.item_code?.trim()) newErrors.item_code = 'Item code is required';
        if (!form.item_name?.trim()) newErrors.item_name = 'Item name is required';
        if (form.sales_price === undefined || form.sales_price < 0) newErrors.sales_price = 'Sales price must be positive';
        if (form.type === 'item' && !form.category_id) newErrors.category_id = 'Category is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please resolve validation errors.');
            return;
        }

        try {
            if (isEdit && itemId) {
                await updateItem.mutateAsync({
                    id: Number(itemId),
                    payload: form as UpdateItemInput,
                });
                toast.success('Updated successfully.');
            } else {
                await createItem.mutateAsync(form);
                toast.success('Created successfully.');
            }
            navigate('/items');
        } catch (error: any) {
            console.error('Error saving item:', error);
            const msg = error.response?.data?.error || error.response?.data?.details || 'Failed to save.';
            const details = typeof msg === 'object' ? JSON.stringify(msg) : msg;
            toast.error(`Failed to save: ${details}`);
        }
    };

    // Category Creation
    const handleCreateCategory = async () => {
        if (!catModal.name.trim()) return;
        try {
            const res = await createCategoryMutation.mutateAsync({ name: catModal.name, description: catModal.desc });
            setForm((f) => ({ ...f, category_id: res.id }));
            setCatModal({ open: false, name: '', desc: '' });
            toast.success('Category created!');
        } catch (e) {
            toast.error('Failed to create category.');
        }
    };

    // Brand Creation
    const handleCreateBrand = async () => {
        if (!brandModal.name.trim()) return;
        try {
            const res = await createBrandMutation.mutateAsync({ name: brandModal.name, description: brandModal.desc });
            setForm((f) => ({ ...f, brand_id: res.id }));
            setBrandModal({ open: false, name: '', desc: '' });
            toast.success('Brand created!');
        } catch (e) {
            toast.error('Failed to create brand.');
        }
    };

    // Unit Creation
    const handleCreateUnit = async () => {
        if (!unitModal.name.trim()) return;
        try {
            const res = await createUnitMutation.mutateAsync({ name: unitModal.name, short_name: unitModal.shortName });
            setForm((f) => ({ ...f, unit_id: res.id }));
            setUnitModal({ open: false, name: '', shortName: '' });
            toast.success('Unit created!');
        } catch (e) {
            toast.error('Failed to create unit.');
        }
    };

    // Tax Creation
    const handleCreateTax = async () => {
        if (!taxModal.name.trim() || taxModal.value < 0) return;
        try {
            const res = await createTaxMutation.mutateAsync({ name: taxModal.name, tax_value: taxModal.value });
            setForm((f) => ({ ...f, tax_id: res.id }));
            setTaxModal({ open: false, name: '', value: 0 });
            toast.success('Tax created!');
        } catch (e) {
            toast.error('Failed to create tax.');
        }
    };

    const isSubmitting = createItem.isPending || updateItem.isPending;

    if (isEdit && itemLoading) {
        return <div className="py-10 text-center text-slate-500">Loading item details...</div>;
    }

    const typeLabel = form.type === 'service' ? 'Service' : 'Item';

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-ink-900">
                        {isEdit ? `Edit ${typeLabel}` : `Add New ${typeLabel}`}
                    </h1>
                    <p className="text-sm text-slate-500">
                        {isEdit ? `Update the details of your ${form.type}` : `Create a new ${form.type} for billing and inventory`}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Main section */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Basic Info (Col Span 2) */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                            <h2 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                Basic Details
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        {typeLabel} Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.item_code || ''}
                                        onChange={(e) => setForm({ ...form, item_code: e.target.value })}
                                        disabled={isEdit}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
                                        placeholder="e.g. IT0001"
                                    />
                                    {errors.item_code && <p className="text-xs text-red-500 mt-1">{errors.item_code}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        {typeLabel} Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.item_name || ''}
                                        onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        placeholder={`e.g. ${form.type === 'service' ? 'Consultancy Service' : 'Wireless Mouse'}`}
                                    />
                                    {errors.item_name && <p className="text-xs text-red-500 mt-1">{errors.item_name}</p>}
                                </div>

                                {form.type === 'item' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                Brand
                                            </label>
                                            <div className="flex gap-1.5">
                                                <select
                                                    value={form.brand_id || ''}
                                                    onChange={(e) => setForm({ ...form, brand_id: e.target.value ? Number(e.target.value) : undefined })}
                                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                                >
                                                    <option value="">-Select Brand-</option>
                                                    {brands.map((b) => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => setBrandModal({ ...brandModal, open: true })}
                                                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                Unit
                                            </label>
                                            <div className="flex gap-1.5">
                                                <select
                                                    value={form.unit_id || ''}
                                                    onChange={(e) => setForm({ ...form, unit_id: e.target.value ? Number(e.target.value) : undefined })}
                                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                                >
                                                    <option value="">-Select Unit-</option>
                                                    {units.map((u) => (
                                                        <option key={u.id} value={u.id}>{u.name} ({u.short_name || u.name})</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => setUnitModal({ ...unitModal, open: true })}
                                                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Category *
                                    </label>
                                    <div className="flex gap-1.5">
                                        <select
                                            value={form.category_id || ''}
                                            onChange={(e) => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : undefined })}
                                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        >
                                            <option value="">-Select Category-</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setCatModal({ ...catModal, open: true })}
                                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>}
                                </div>

                                {form.type === 'item' ? (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            SKU
                                        </label>
                                        <input
                                            type="text"
                                            value={form.sku || ''}
                                            onChange={(e) => setForm({ ...form, sku: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                            placeholder="Stock Keeping Unit"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            SAC
                                        </label>
                                        <input
                                            type="text"
                                            value={form.sac || ''}
                                            onChange={(e) => setForm({ ...form, sac: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                            placeholder="Service Accounting Code"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        HSN
                                    </label>
                                    <input
                                        type="text"
                                        value={form.hsn || ''}
                                        onChange={(e) => setForm({ ...form, hsn: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        placeholder="HSN Code"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Barcode / Serial
                                    </label>
                                    <input
                                        type="text"
                                        value={form.barcode || ''}
                                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        placeholder="Barcode"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={form.description || ''}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                                    rows={3}
                                    placeholder="Write details or specifications here..."
                                />
                            </div>
                        </div>

                        {/* Pricing Details */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                            <h2 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                Pricing & Tax Setup
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        {form.type === 'service' ? 'Price (Expenses)' : 'Cost Price'}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.price_expenses || ''}
                                        onChange={(e) => setForm({ ...form, price_expenses: parseFloat(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        placeholder="0.00"
                                    />
                                    {form.type === 'service' && <span className="text-[10px] text-slate-400">Enter "0" if there is no expenses</span>}
                                </div>

                                {form.type === 'item' && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            Purchase Price
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.purchase_price || ''}
                                            onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                            placeholder="0.00"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Sales Price *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.sales_price || ''}
                                        onChange={(e) => setForm({ ...form, sales_price: parseFloat(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        placeholder="0.00"
                                    />
                                    {errors.sales_price && <p className="text-xs text-red-500 mt-1">{errors.sales_price}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        MRP
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.mrp || ''}
                                        onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) || undefined })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        placeholder="Max Retail Price"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Discount Type
                                    </label>
                                    <select
                                        value={form.discount_type || 'percentage'}
                                        onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Flat</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Discount Value
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.discount_value || ''}
                                        onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Tax / GST
                                    </label>
                                    <div className="flex gap-1.5">
                                        <select
                                            value={form.tax_id || ''}
                                            onChange={(e) => setForm({ ...form, tax_id: e.target.value ? Number(e.target.value) : undefined })}
                                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        >
                                            <option value="">-Select Tax-</option>
                                            {taxes.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.tax_value}%)</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setTaxModal({ ...taxModal, open: true })}
                                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Tax Type
                                    </label>
                                    <select
                                        value={form.tax_type || 'inclusive'}
                                        onChange={(e) => setForm({ ...form, tax_type: e.target.value as any })}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    >
                                        <option value="inclusive">Inclusive</option>
                                        <option value="exclusive">Exclusive</option>
                                    </select>
                                </div>

                                {profitMargin > 0 && (
                                    <div className="col-span-3">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 text-emerald-600">
                                            Est. Profit Margin (%)
                                        </label>
                                        <div className="w-full rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 border border-emerald-100">
                                            {profitMargin.toFixed(2)}%
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stock & Side settings (Col Span 1) */}
                    <div className="space-y-6">
                        {form.type === 'item' && (
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                                <h2 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                    Inventory Settings
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            Warehouse
                                        </label>
                                        <select
                                            value={form.warehouse_id || ''}
                                            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value ? Number(e.target.value) : undefined })}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        >
                                            <option value="">-Select Warehouse-</option>
                                            {warehouses.map((wh) => (
                                                <option key={wh.id} value={wh.id}>{wh.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            Opening Stock
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.opening_stock || ''}
                                            onChange={(e) => setForm({ ...form, opening_stock: parseInt(e.target.value) || 0 })}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            Alert Quantity
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.alert_quantity || ''}
                                            onChange={(e) => setForm({ ...form, alert_quantity: parseInt(e.target.value) || 0 })}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                            <h2 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                Additional Options
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Seller Points
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.seller_points || ''}
                                        onChange={(e) => setForm({ ...form, seller_points: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={form.status || 'active'}
                                        onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="discontinued">Discontinued</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Image URL (Mock Upload)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.image_url || ''}
                                        onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                        placeholder="Paste image link..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/items')}
                        className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : isEdit ? `Save Changes` : `Save`}
                    </button>
                </div>
            </form>

            {/* ----------------- Popups / Modals ----------------- */}

            {/* Category Modal */}
            {catModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-base font-bold text-slate-800">Add Category</h3>
                            <button onClick={() => setCatModal({ ...catModal, open: false })} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Category Name *</label>
                                <input
                                    type="text"
                                    value={catModal.name}
                                    onChange={(e) => setCatModal({ ...catModal, name: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    placeholder="Electronics"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                                <textarea
                                    value={catModal.desc}
                                    onChange={(e) => setCatModal({ ...catModal, desc: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                                    rows={2}
                                    placeholder="Details..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={() => setCatModal({ ...catModal, open: false })}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateCategory}
                                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Brand Modal */}
            {brandModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-base font-bold text-slate-800">Add Brand</h3>
                            <button onClick={() => setBrandModal({ ...brandModal, open: false })} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Brand Name *</label>
                                <input
                                    type="text"
                                    value={brandModal.name}
                                    onChange={(e) => setBrandModal({ ...brandModal, name: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    placeholder="Sony"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                                <textarea
                                    value={brandModal.desc}
                                    onChange={(e) => setBrandModal({ ...brandModal, desc: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                                    rows={2}
                                    placeholder="Details..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={() => setBrandModal({ ...brandModal, open: false })}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBrand}
                                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unit Modal */}
            {unitModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-base font-bold text-slate-800">Add Unit</h3>
                            <button onClick={() => setUnitModal({ ...unitModal, open: false })} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Unit Name *</label>
                                <input
                                    type="text"
                                    value={unitModal.name}
                                    onChange={(e) => setUnitModal({ ...unitModal, name: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    placeholder="Pieces"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Short Name / Code</label>
                                <input
                                    type="text"
                                    value={unitModal.shortName}
                                    onChange={(e) => setUnitModal({ ...unitModal, shortName: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    placeholder="PCS"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={() => setUnitModal({ ...unitModal, open: false })}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateUnit}
                                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tax Modal */}
            {taxModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-base font-bold text-slate-800">Add Tax Rate</h3>
                            <button onClick={() => setTaxModal({ ...taxModal, open: false })} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Tax Name *</label>
                                <input
                                    type="text"
                                    value={taxModal.name}
                                    onChange={(e) => setTaxModal({ ...taxModal, name: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    placeholder="GST 18%"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Tax Rate (%) *</label>
                                <input
                                    type="number"
                                    value={taxModal.value || ''}
                                    onChange={(e) => setTaxModal({ ...taxModal, value: parseFloat(e.target.value) || 0 })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    placeholder="18"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={() => setTaxModal({ ...taxModal, open: false })}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTax}
                                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
