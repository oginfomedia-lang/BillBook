import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { useBulkImportItems } from '../hooks/useItems';
import toast from 'react-hot-toast';

export function ImportItemsPage() {
    const navigate = useNavigate();
    const importItems = useBulkImportItems();

    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [importErrors, setImportErrors] = useState<any[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setImportErrors([]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.endsWith('.csv')) {
                setFile(droppedFile);
                setImportErrors([]);
            } else {
                toast.error('Please select a valid CSV file.');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        try {
            const res = await importItems.mutateAsync(file);
            const parts = [`${res.items_created} item(s) created`];
            if (res.brands_created) parts.push(`${res.brands_created} new brand(s) added`);
            if (res.categories_created) parts.push(`${res.categories_created} new categor${res.categories_created === 1 ? 'y' : 'ies'} added`);
            if (res.items_failed) parts.push(`${res.items_failed} row(s) skipped`);
            toast.success(parts.join(', '));
            if (res.errors && res.errors.length > 0) {
                setImportErrors(res.errors);
            } else {
                navigate('/items');
            }
        } catch (err: any) {
            console.error(err);
            const backendDetails = err?.response?.data?.errors || err?.response?.data?.details || [];
            setImportErrors(backendDetails);
            toast.error(err?.response?.data?.error || 'Failed to import CSV.');
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/items')}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-ink-900">Import Items</h1>
                    <p className="text-sm text-slate-500">Bulk create products from a CSV file</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Drag and drop upload */}
                <div className="md:col-span-2 space-y-4">
                    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-12 px-6 text-center cursor-pointer transition-colors ${
                                dragOver ? 'border-brand bg-brand/5' : 'border-slate-300 hover:border-brand'
                            }`}
                        >
                            <Upload className="h-10 w-10 text-slate-400 mb-3" />
                            <p className="text-sm font-semibold text-slate-700">
                                {file ? file.name : 'Drag & drop your CSV file here'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">or browse files from your computer</p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                                id="csv-upload"
                            />
                            <label
                                htmlFor="csv-upload"
                                className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm"
                            >
                                Select CSV
                            </label>
                        </div>

                        {file && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <FileText className="text-brand h-5 w-5" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-700">{file.name}</p>
                                        <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="text-xs font-semibold text-red-500 hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        {importErrors.length > 0 && (
                            <div className="rounded-lg bg-rose-50 border border-rose-100 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                                    <AlertCircle size={16} />
                                    Import Validation Failures
                                </div>
                                <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside">
                                    {importErrors.map((err, i) => (
                                        <li key={i}>
                                            Row {err.row}: {JSON.stringify(err.errors)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => navigate('/items')}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!file || importItems.isPending}
                                className="rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white hover:bg-brand-dark shadow-sm transition-colors disabled:opacity-40"
                            >
                                {importItems.isPending ? 'Importing...' : 'Upload & Import'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* CSV Instructions */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 h-fit">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">CSV Guide & Format</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        To successfully upload and import your inventory items, your CSV sheet must include the following headers:
                    </p>
                    <div className="rounded-lg bg-slate-50 p-3 font-mono text-[10px] text-slate-600 space-y-2 overflow-x-auto">
                        <div>item_code, item_name, sales_price, type</div>
                        <div className="text-slate-400"># Optional fields:</div>
                        <div>sku, hsn, barcode, description, purchase_price, opening_stock, alert_quantity, category, brand, unit</div>
                    </div>
                    <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span><strong>type</strong>: must be <code className="bg-slate-100 px-1 rounded">item</code>.</span>
                        </div>
                        <div className="flex gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span><strong>category/brand/unit</strong>: Must match names of existing database entries, or will import without relations.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
