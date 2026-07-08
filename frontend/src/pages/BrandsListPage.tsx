import { useState } from 'react';
import { Plus, Search, Trash2, Edit2, X } from 'lucide-react';
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '../hooks/useItems';
import { TableSkeleton } from '../components/ui/Skeletons';
import toast from 'react-hot-toast';

export function BrandsListPage() {
    const { data: brands = [], isLoading } = useBrands();
    const createBrand = useCreateBrand();
    const updateBrand = useUpdateBrand();
    const deleteBrand = useDeleteBrand();

    const [search, setSearch] = useState('');
    const [modal, setModal] = useState({ open: false, isEdit: false, id: 0, name: '', desc: '', status: 'active' });

    const handleOpenCreate = () => {
        setModal({ open: true, isEdit: false, id: 0, name: '', desc: '', status: 'active' });
    };

    const handleOpenEdit = (brand: any) => {
        setModal({ open: true, isEdit: true, id: brand.id, name: brand.name, desc: brand.description || '', status: brand.status || 'active' });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modal.name.trim()) return;

        try {
            if (modal.isEdit) {
                await updateBrand.mutateAsync({
                    id: modal.id,
                    payload: { name: modal.name, description: modal.desc }
                });
                toast.success('Brand updated successfully.');
            } else {
                await createBrand.mutateAsync({
                    name: modal.name,
                    description: modal.desc
                });
                toast.success('Brand created successfully.');
            }
            setModal({ ...modal, open: false });
        } catch (err) {
            toast.error('Failed to save brand.');
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (confirm(`Are you sure you want to delete brand "${name}"?`)) {
            try {
                await deleteBrand.mutateAsync(id);
                toast.success('Brand deleted successfully.');
            } catch (err) {
                toast.error('Failed to delete brand.');
            }
        }
    };

    const filteredBrands = brands.filter((brand) =>
        brand.name.toLowerCase().includes(search.toLowerCase()) ||
        (brand.description && brand.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-ink-900">Brands List</h1>
                    <p className="text-sm text-slate-500">{filteredBrands.length} brands found</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
                >
                    <Plus size={16} /> Create Brand
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search brand name or description..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                            <th className="px-4 py-3 w-12">
                                <input type="checkbox" className="rounded border-slate-300" />
                            </th>
                            <th className="px-4 py-3">Brand Name</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <TableSkeleton rows={4} cols={5} />
                        ) : filteredBrands.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                                    No brands found.
                                </td>
                            </tr>
                        ) : (
                            filteredBrands.map((brand) => (
                                <tr key={brand.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <input type="checkbox" className="rounded border-slate-300" />
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-700">
                                        {brand.name}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {brand.description || '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            (brand as any).status === 'inactive'
                                                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                : 'bg-green-50 text-green-700 border border-green-200'
                                        }`}>
                                            {(brand as any).status || 'active'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => handleOpenEdit(brand)}
                                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(brand.id, brand.name)}
                                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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

            {/* Modal */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45">
                    <form onSubmit={handleSave} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-base font-bold text-slate-800">
                                {modal.isEdit ? 'Edit Brand' : 'Create Brand'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModal({ ...modal, open: false })}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Brand Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={modal.name}
                                    onChange={(e) => setModal({ ...modal, name: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                    placeholder="e.g. Sony, Logitech"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={modal.desc}
                                    onChange={(e) => setModal({ ...modal, desc: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                                    rows={3}
                                    placeholder="Write a brief brand description..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setModal({ ...modal, open: false })}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                            >
                                {modal.isEdit ? 'Save Changes' : 'Create'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
