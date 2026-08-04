import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2, Download, Printer, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useItems, useDeleteItem, useCategories, useExportBranchMapping, useImportBranchMapping } from '../hooks/useItems';
import { useWarehouses } from '../hooks/useWarehouses';
import { TableSkeleton } from '../components/ui/Skeletons';
import { ExportToolbar, type ColumnDef } from '../components/ui/ExportToolbar';
import { formatMoney } from '../utils/format';
import type { ItemStatus, ItemType } from '../api/items';

const STATUS_FILTERS: { label: string; value: ItemStatus | '' }[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Discontinued', value: 'discontinued' },
];

const ITEM_COLUMNS: ColumnDef[] = [
  { key: 'item_code', label: 'Item Code', visible: true },
  { key: 'item_name', label: 'Item Name', visible: true },
  { key: 'type', label: 'Type', visible: true },
  { key: 'category', label: 'Category', visible: true },
  { key: 'brand', label: 'Brand', visible: true },
  { key: 'unit', label: 'Unit', visible: true },
  { key: 'stock', label: 'Stock', visible: true },
  { key: 'alert_quantity', label: 'Alert Qty', visible: true },
  { key: 'sales_price', label: 'Sales Price', visible: true },
  { key: 'status', label: 'Status', visible: true },
];

export function ItemsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<ItemStatus | ''>('');
    const [itemType, setItemType] = useState<ItemType | ''>('');
    const [warehouseId, setWarehouseId] = useState<number | ''>('');
    const [categoryId, setCategoryId] = useState<number | ''>('');
    const [columns, setColumns] = useState<ColumnDef[]>(ITEM_COLUMNS);

    const { data, isLoading } = useItems({
        page,
        search,
        status: status || undefined,
        type: itemType || undefined,
        warehouse_id: warehouseId || undefined,
        category_id: categoryId || undefined,
    });

    const { data: warehouseData } = useWarehouses({ per_page: 100 });
    const warehouses = warehouseData?.items ?? [];

    const { data: categories } = useCategories();

    const deleteItem = useDeleteItem();
    const items = data?.items ?? [];

    const exportBranchMapping = useExportBranchMapping();
    const importBranchMapping = useImportBranchMapping();
    const branchMappingFileRef = useRef<HTMLInputElement>(null);

    const handleExportBranchMapping = () => {
        exportBranchMapping.mutate(undefined, {
            onError: () => toast.error("Couldn't export branch mapping."),
        });
    };

    const handleImportBranchMappingFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        importBranchMapping.mutate(file, {
            onSuccess: (result) => {
                toast.success(`Updated ${result.items_updated} items (${result.rows_skipped} skipped, ${result.errors.length} errors)`);
            },
            onError: () => toast.error("Couldn't import branch mapping."),
        });
        e.target.value = '';
    };

    const handleDelete = (id: number, itemName: string) => {
        if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
            deleteItem.mutate(id);
        }
    };

    const handleReset = () => {
        setSearch('');
        setStatus('');
        setItemType('');
        setWarehouseId('');
        setCategoryId('');
        setPage(1);
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-ink-900">Items List</h1>
                    <p className="text-sm text-slate-500">{data?.total ?? 0} total items / services</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/items/new"
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
                    >
                        <Plus size={16} /> Create Item
                    </Link>
                    <Link
                        to="/items/new-service"
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                        <Plus size={16} /> Create Service
                    </Link>
                    <button
                        type="button"
                        onClick={handleExportBranchMapping}
                        disabled={exportBranchMapping.isPending}
                        title="Download a CSV of every item with its current branch/warehouse, to bulk-assign items that have none"
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        <Download size={16} /> Export Branch Mapping
                    </button>
                    <button
                        type="button"
                        onClick={() => branchMappingFileRef.current?.click()}
                        disabled={importBranchMapping.isPending}
                        title="Upload the filled-in branch mapping CSV to bulk-assign items to branches"
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        <Upload size={16} /> Import Branch Mapping
                    </button>
                    <input
                        ref={branchMappingFileRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleImportBranchMappingFile}
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-5 items-end">
                    {/* Search */}
                    <div className="relative col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            value={search}
                            onChange={(e) => {
                                      setSearch(e.target.value);
                                      setPage(1);
                            }}
                            placeholder="Search by code, name, SKU, or barcode..."
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                    </div>

                    {/* Warehouse Filter */}
                    <div>
                        <select
                            value={warehouseId}
                            onChange={(e) => {
                                setWarehouseId(e.target.value ? Number(e.target.value) : '');
                                setPage(1);
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            <option value="">-All Warehouses-</option>
                            {warehouses.map((wh) => (
                                <option key={wh.id} value={wh.id}>
                                    {wh.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Item Type Filter */}
                    <div>
                        <select
                            value={itemType}
                            onChange={(e) => {
                                setItemType(e.target.value as ItemType | '');
                                setPage(1);
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            <option value="">All Types</option>
                            <option value="item">Item</option>
                            <option value="service">Service</option>
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                        <select
                            value={categoryId}
                            onChange={(e) => {
                                setCategoryId(e.target.value ? Number(e.target.value) : '');
                                setPage(1);
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            <option value="">-All Categories-</option>
                            {(categories ?? []).map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <div className="flex gap-2">
                        <select
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value as ItemStatus | '');
                                setPage(1);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            {STATUS_FILTERS.map((filter) => (
                                <option key={filter.value} value={filter.value}>
                                    {filter.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleReset}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* Export Toolbar */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{data?.total ?? 0} records</span>
                <ExportToolbar
                    data={items.map((item) => ({
                        item_code: item.item_code,
                        item_name: item.item_name,
                        type: item.type,
                        category: (item as any).category?.name ?? '',
                        brand: (item as any).brand?.name ?? '',
                        unit: (item as any).unit?.short_name ?? '',
                        stock: item.opening_stock ?? 0,
                        alert_quantity: item.alert_quantity ?? 0,
                        sales_price: item.sales_price,
                        status: item.status,
                    }))}
                    columns={columns}
                    onColumnsChange={setColumns}
                    filename="items-list"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[1000px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                            <th className="px-4 py-3 w-12">
                                <input type="checkbox" className="rounded border-slate-300" />
                            </th>
                            <th className="px-4 py-3">Image</th>
                            <th className="px-4 py-3">Item Code</th>
                            <th className="px-4 py-3">Item Name</th>
                            <th className="px-4 py-3">Brand</th>
                            <th className="px-4 py-3">Category/Item Type</th>
                            <th className="px-4 py-3">Unit</th>
                            <th className="px-4 py-3 text-right">Stock</th>
                            <th className="px-4 py-3 text-right">Alert Qty</th>
                            <th className="px-4 py-3 text-right">Sales Price</th>
                            <th className="px-4 py-3">Tax</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <TableSkeleton rows={6} cols={13} />
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={13} className="px-4 py-10 text-center text-sm text-slate-400">
                                    No items or services found.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <input type="checkbox" className="rounded border-slate-300" />
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.item_name}
                                                className="h-10 w-10 rounded object-cover border border-slate-200"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-medium">
                                                No Img
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                        {item.item_code}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-brand">
                                            {item.item_name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 space-x-2">
                                            {item.hsn && <span>HSN: {item.hsn}</span>}
                                            {item.sac && <span>SAC: {item.sac}</span>}
                                            {item.sku && <span>SKU: {item.sku}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {item.brand?.name ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-slate-700">{item.category?.name ?? '—'}</span>
                                        <span className={`ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                            item.type === 'service' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}>
                                            {(item.type || 'item').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {item.unit?.short_name || item.unit?.name || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {item.type === 'service' ? (
                                            <span className="text-slate-400">—</span>
                                        ) : (
                                            <span className={item.opening_stock <= item.alert_quantity ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                                                {item.opening_stock.toFixed(2)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {item.type === 'service' ? '—' : item.alert_quantity}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                                        {formatMoney(item.sales_price)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600">
                                        {item.tax ? `${item.tax.name} (${item.tax.tax_value}%)` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            item.status === 'active'
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : item.status === 'inactive'
                                                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Link
                                                to={`/items/${item.id}/edit`}
                                                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-brand transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(item.id, item.item_name)}
                                                className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-slate-500">
                        Page {data.page} of {data.pages}
                    </span>
                    <button
                        disabled={page >= data.pages}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
