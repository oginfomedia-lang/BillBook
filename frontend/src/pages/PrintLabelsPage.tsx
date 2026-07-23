import { useState } from 'react';
import { useItems } from '../hooks/useItems';
import { Printer, RefreshCw } from 'lucide-react';
import { formatMoney } from '../utils/format';

export function PrintLabelsPage() {
    const { data: itemData } = useItems({ per_page: 100 });
    const items = itemData?.items ?? [];

    const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
    const [quantity, setQuantity] = useState<number>(12);
    const [showPrice, setShowPrice] = useState(true);
    const [showName, setShowName] = useState(true);
    const [showBrand, setShowBrand] = useState(true);

    const selectedItem = items.find((it) => it.id === Number(selectedItemId));

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                <div>
                    <h1 className="text-2xl font-semibold text-ink-900">Print Labels</h1>
                    <p className="text-sm text-slate-500">Generate and print barcodes for your products</p>
                </div>
                <button
                    onClick={handlePrint}
                    disabled={!selectedItemId}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-40"
                >
                    <Printer size={16} /> Print Labels
                </button>
            </div>

            {/* Config & Preview Container */}
            <div className="grid gap-6 md:grid-cols-3 print:block">
                {/* Configuration Panel */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 print:hidden">
                    <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Label Settings</h2>
                    
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Select Item *
                        </label>
                        <select
                            value={selectedItemId}
                            onChange={(e) => setSelectedItemId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            <option value="">-Select Item-</option>
                            {items.filter(it => it.type !== 'service').map((it) => (
                                <option key={it.id} value={it.id}>
                                    {it.item_name} ({it.item_code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Label Quantity
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={quantity}
                            onChange={(e) => {
                                const parsed = parseInt(e.target.value, 10);
                                setQuantity(Number.isNaN(parsed) ? 1 : Math.min(100, Math.max(1, parsed)));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Visible Fields</span>
                        
                        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <input
                                type="checkbox"
                                checked={showName}
                                onChange={(e) => setShowName(e.target.checked)}
                                className="rounded border-slate-300 text-brand focus:ring-brand"
                            />
                            Show Product Name
                        </label>

                        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <input
                                type="checkbox"
                                checked={showPrice}
                                onChange={(e) => setShowPrice(e.target.checked)}
                                className="rounded border-slate-300 text-brand focus:ring-brand"
                            />
                            Show Price
                        </label>

                        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <input
                                type="checkbox"
                                checked={showBrand}
                                onChange={(e) => setShowBrand(e.target.checked)}
                                className="rounded border-slate-300 text-brand focus:ring-brand"
                            />
                            Show Brand
                        </label>
                    </div>
                </div>

                {/* Print Sheet Preview */}
                <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:p-0">
                    <h2 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 print:hidden">
                        Label Preview Sheet
                    </h2>

                    {!selectedItemId ? (
                        <div className="py-20 text-center text-slate-400 font-medium print:hidden">
                            Select an item to preview barcode labels.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:gap-2 print:grid-cols-4">
                            {Array.from({ length: quantity }).map((_, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg text-center bg-slate-50/50 print:bg-white print:border print:border-black/20"
                                    style={{ pageBreakInside: 'avoid' }}
                                >
                                    {showBrand && selectedItem?.brand && (
                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                                            {selectedItem.brand.name}
                                        </div>
                                    )}
                                    
                                    {showName && (
                                        <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                                            {selectedItem?.item_name}
                                        </div>
                                    )}

                                    {/* Barcode Mock */}
                                    <div className="my-2 space-y-0.5">
                                        <div className="flex justify-center gap-0.5">
                                            {/* Renders a cute barcode dummy */}
                                            {[2, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2].map((w, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-slate-900 print:bg-black"
                                                    style={{ width: `${w}px`, height: '24px' }}
                                                />
                                            ))}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                                            {selectedItem?.barcode || selectedItem?.item_code}
                                        </div>
                                    </div>

                                    {showPrice && (
                                        <div className="text-xs font-extrabold text-brand print:text-black">
                                            {formatMoney(selectedItem?.sales_price || 0)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
