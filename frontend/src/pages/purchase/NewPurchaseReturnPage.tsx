// frontend/src/pages/purchase/NewPurchaseReturnPage.tsx

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, Plus, Trash2, Search, X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { createPurchaseReturn, getPurchase, listPurchases } from "../../api/purchases";
import { formatMoney, formatDate } from "../../utils/format";

export function NewPurchaseReturnPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const initialPurchaseId = queryParams.get('purchaseId');

    const [purchaseId, setPurchaseId] = useState<string>(initialPurchaseId || "");
    const [purchase, setPurchase] = useState<any>(null);
    const [items, setItems] = useState<any[]>([{
        product_id: null,
        description: "",
        quantity: 1,
        purchase_price: 0,
        tax_amount: 0
    }]);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    // 🔽 NEW: State for dropdown
    const [purchaseCodes, setPurchaseCodes] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loadingCodes, setLoadingCodes] = useState(false);

    // 🔽 NEW: Load purchase codes on mount
    useEffect(() => {
        fetchPurchaseCodes();
    }, []);

    // 🔽 NEW: Fetch purchase codes for dropdown
    const fetchPurchaseCodes = async () => {
        setLoadingCodes(true);
        try {
            console.log("📦 Fetching purchase codes...");
            const data = await listPurchases({ per_page: 100 });
            console.log("📦 Purchase data:", data);

            // Filter only received/partial purchases (can be returned)
            const available = data.items.filter((p: any) =>
                p.status === 'received' || p.status === 'partial'
            );
            console.log("📦 Available for return:", available);
            setPurchaseCodes(available);
        } catch (error) {
            console.error("❌ Failed to load purchase codes:", error);
            toast.error("Failed to load purchase codes");
        } finally {
            setLoadingCodes(false);
        }
    };

    // 🔽 NEW: Filter purchase codes based on search
    const filteredCodes = purchaseCodes.filter((p) =>
        p.purchase_code.toLowerCase().includes(purchaseId.toLowerCase()) ||
        (p.supplier?.name?.toLowerCase() || '').includes(purchaseId.toLowerCase())
    );

    // Auto-load purchase if purchaseId is provided
    useEffect(() => {
        if (initialPurchaseId) {
            handlePurchaseSearch(initialPurchaseId);
        }
    }, [initialPurchaseId]);

    const handlePurchaseSearch = async (id?: string) => {
        const searchId = id || purchaseId;
        if (!searchId) {
            toast.error("Please enter a purchase code");
            return;
        }

        setSearching(true);
        try {
            const data = await getPurchase(Number(searchId));
            setPurchase(data);
            // Initialize items from purchase items
            if (data.items && data.items.length > 0) {
                setItems(data.items.map((item: any) => ({
                    product_id: item.product_id,
                    description: item.description,
                    quantity: 1,
                    purchase_price: item.purchase_price || item.unit_price || 0,
                    tax_amount: item.tax_amount || 0,
                    max_quantity: item.quantity || 1,
                })));
            }
            setShowDropdown(false);
            toast.success("Purchase loaded successfully");
        } catch (error) {
            toast.error("Purchase not found. Please check the code.");
        } finally {
            setSearching(false);
        }
    };

    const handleSave = async () => {
        if (!purchase) {
            toast.error("Please load a purchase first");
            return;
        }

        const validItems = items.filter(item => item.description.trim() && item.quantity > 0);
        if (validItems.length === 0) {
            toast.error("Please add at least one item to return");
            return;
        }

        setSaving(true);
        try {
            await createPurchaseReturn({
                purchase_id: purchase.id,
                items: validItems.map((item) => ({
                    product_id: item.product_id,
                    description: item.description,
                    quantity: item.quantity,
                    purchase_price: item.purchase_price,
                    tax_amount: item.tax_amount || 0,
                })),
                notes: notes || null,
            });
            toast.success("Purchase return created successfully!");
            navigate("/purchase/returns");
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to create return");
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => {
        setItems([...items, {
            product_id: null,
            description: "",
            quantity: 1,
            purchase_price: 0,
            tax_amount: 0,
            max_quantity: 1,
        }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handlePurchaseSearch();
        }
    };

    const handleSelectPurchase = (selectedPurchase: any) => {
        setPurchaseId(selectedPurchase.purchase_code);
        setShowDropdown(false);
        // Auto-load the purchase
        handlePurchaseSearch(selectedPurchase.purchase_code);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="cursor-pointer hover:text-brand" onClick={() => navigate("/dashboard")}>
                    Home
                </span>
                <ChevronRight size={12} />
                <span className="cursor-pointer hover:text-brand" onClick={() => navigate("/purchase/returns")}>
                    Purchase Returns List
                </span>
                <ChevronRight size={12} />
                <span className="font-medium text-slate-700">New Purchase Return</span>
            </div>

            {/* Title */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">Purchase Return</h1>
                <p className="text-xs text-slate-500">Create a new purchase return</p>
            </div>

            {/* Purchase Search */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Purchase Code <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={purchaseId}
                                    onChange={(e) => {
                                        setPurchaseId(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => {
                                        // Refresh purchase codes when focusing
                                        if (purchaseCodes.length === 0) {
                                            fetchPurchaseCodes();
                                        }
                                        setShowDropdown(true);
                                    }}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Enter purchase code (e.g. PU-0001)"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDropdown(!showDropdown);
                                        if (purchaseCodes.length === 0) {
                                            fetchPurchaseCodes();
                                        }
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <ChevronDown size={18} />
                                </button>

                                {/* 🔽 DROPDOWN LIST */}
                                {showDropdown && (
                                    <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                        {loadingCodes ? (
                                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1e6fa8] border-t-transparent mr-2" />
                                                Loading...
                                            </div>
                                        ) : purchaseCodes.length === 0 ? (
                                            <div className="px-4 py-6 text-sm text-slate-500 text-center">
                                                <p className="font-medium text-slate-600">No purchases available for return</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Only purchases with status "Received" or "Partial" can be returned
                                                </p>
                                                <button
                                                    onClick={fetchPurchaseCodes}
                                                    className="mt-2 text-[#1e6fa8] hover:underline text-xs"
                                                >
                                                    Refresh list
                                                </button>
                                            </div>
                                        ) : filteredCodes.length === 0 && purchaseId ? (
                                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                                No matching purchases found for "{purchaseId}"
                                            </div>
                                        ) : (
                                            filteredCodes.slice(0, 15).map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleSelectPurchase(p)}
                                                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">
                                                            {p.purchase_code}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {p.supplier?.name || "No supplier"} · {formatMoney(p.grand_total || 0)}
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'received'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                        {filteredCodes.length > 15 && (
                                            <div className="px-4 py-2 text-xs text-slate-400 text-center border-t border-slate-100">
                                                Showing 15 of {filteredCodes.length} results
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handlePurchaseSearch()}
                                disabled={searching}
                                className="flex items-center gap-2 rounded-lg bg-[#1e6fa8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a5f90] disabled:opacity-50"
                            >
                                <Search size={16} /> {searching ? "Searching..." : "Load"}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Type to search or select from dropdown
                        </p>
                    </div>
                </div>

                {purchase && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-slate-500">Supplier</p>
                                <p className="font-semibold text-slate-800">{purchase.supplier?.name || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Purchase Date</p>
                                <p className="font-semibold text-slate-800">{formatDate(purchase.purchase_date)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Total Amount</p>
                                <p className="font-semibold text-slate-800">{formatMoney(purchase.grand_total)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Status</p>
                                <p className="font-semibold text-slate-800 capitalize">{purchase.status}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Items Table */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700">Items to Return</h3>
                    <span className="text-xs text-slate-400">
                        {items.filter(i => i.description.trim()).length} items
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#1e6fa8] text-left text-xs font-semibold text-white">
                                <th className="px-3 py-2.5">Item Name</th>
                                <th className="px-3 py-2.5 text-center w-24">Quantity</th>
                                <th className="px-3 py-2.5 text-right w-28">Purchase Price</th>
                                <th className="px-3 py-2.5 text-right w-28">Tax Amount</th>
                                <th className="px-3 py-2.5 text-right w-28">Total</th>
                                <th className="px-3 py-2.5 w-12">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const total = (item.quantity || 0) * (item.purchase_price || 0) + (item.tax_amount || 0);
                                return (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-2">
                                            <input
                                                value={item.description}
                                                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                                placeholder="Item description"
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-[#1e6fa8] focus:outline-none"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={item.quantity === 0 ? '' : item.quantity}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const cleanVal = val.replace(/^0+/, '');
                                                    if (cleanVal === '' || /^\d+$/.test(cleanVal)) {
                                                        updateItem(idx, 'quantity', cleanVal === '' ? 0 : parseFloat(cleanVal));
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (!item.quantity || item.quantity === 0) {
                                                        updateItem(idx, 'quantity', 1);
                                                    }
                                                }}
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-center focus:border-[#1e6fa8] focus:outline-none"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.purchase_price === 0 ? '' : item.purchase_price}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const cleanVal = val.replace(/^0+/, '');
                                                    if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
                                                        updateItem(idx, 'purchase_price', cleanVal === '' ? 0 : parseFloat(cleanVal));
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (!item.purchase_price) {
                                                        updateItem(idx, 'purchase_price', 0);
                                                    }
                                                }}
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-right focus:border-[#1e6fa8] focus:outline-none"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.tax_amount === 0 ? '' : item.tax_amount}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const cleanVal = val.replace(/^0+/, '');
                                                    if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
                                                        updateItem(idx, 'tax_amount', cleanVal === '' ? 0 : parseFloat(cleanVal));
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (!item.tax_amount) {
                                                        updateItem(idx, 'tax_amount', 0);
                                                    }
                                                }}
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-right focus:border-[#1e6fa8] focus:outline-none"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-slate-800">
                                            {formatMoney(total)}
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <button
                    type="button"
                    onClick={addItem}
                    className="mt-3 flex items-center gap-1 text-sm text-[#1e6fa8] hover:underline"
                >
                    <Plus size={16} /> Add Item
                </button>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Return notes (e.g. reason for return)..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                />
            </div>

            {/* Summary */}
            {purchase && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-slate-500">Total Return Amount</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {formatMoney(items.reduce((sum, item) =>
                                    sum + (item.quantity || 0) * (item.purchase_price || 0) + (item.tax_amount || 0), 0
                                ))}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Original Purchase Total</p>
                            <p className="text-lg font-semibold text-slate-600">{formatMoney(purchase.grand_total)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4 pb-8">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !purchase}
                    className="min-w-40 rounded-lg bg-emerald-500 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm"
                >
                    {saving ? "Saving…" : "Save Return"}
                </button>
                <button
                    type="button"
                    onClick={() => navigate("/purchase/returns")}
                    className="min-w-40 rounded-lg bg-amber-500 px-8 py-3 text-sm font-bold text-white hover:bg-amber-600 transition-colors shadow-sm"
                >
                    Close
                </button>
            </div>
        </div>
    );
}