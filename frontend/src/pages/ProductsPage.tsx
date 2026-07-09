import { useState, type FormEvent } from "react";
import { Plus, Search, Trash2, Edit2, Upload } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useProducts, useCreateProduct, useDeleteProduct, useImportProducts, useUpdateProduct } from "../hooks/useProducts";
import { TableSkeleton } from "../components/ui/Skeletons";
import { Modal } from "../components/ui/Modal";
import { formatMoney } from "../utils/format";
import type { Product } from "../types";
import toast from "react-hot-toast";
import { useTranslation } from "../context/LanguageContext";
import { useBranch } from "../context/BranchContext";

export function ProductsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { currentBranchId } = useBranch();
  const { hasPermission } = useAuth();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    unit_price: 0,
    tax_rate: 0,
    stock_quantity: 0,
    unit: "pcs",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    description: "",
    unit_price: 0,
    tax_rate: 0,
    stock_quantity: 0,
    unit: "pcs",
  });

  const { data, isLoading } = useProducts({ page, search, branch_id: currentBranchId || undefined });
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const importProducts = useImportProducts();
  const [file, setFile] = useState<File | null>(null);
  const canImportProducts = hasPermission("products.import");

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      branch_id: currentBranchId || undefined,
    };
    createProduct.mutate(payload, {
      onSuccess: () => {
        setForm({
          name: "",
          sku: "",
          description: "",
          unit_price: 0,
          tax_rate: 0,
          stock_quantity: 0,
          unit: "pcs",
        });
        setShowForm(false);
      },
    });
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setEditForm({
      name: p.name,
      sku: p.sku || "",
      description: p.description || "",
      unit_price: p.unit_price,
      tax_rate: p.tax_rate,
      stock_quantity: p.stock_quantity,
      unit: p.unit,
    });
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const payload = {
      ...editForm,
      branch_id: currentBranchId || undefined,
    };
    updateProduct.mutate(
      { id: editingProduct.id, payload },
      {
        onSuccess: () => setEditingProduct(null),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm(t("Are you sure you want to remove this product?"))) {
      deleteProduct.mutate(id);
    }
  };

  const handleImportSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      toast.error('Please select a CSV file.');
      return;
    }
    importProducts.mutate(
      { file, branch_id: currentBranchId || undefined },
      {
        onSuccess: () => setFile(null),
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Products")}</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} {t("total")}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark shadow-sm"
        >
          <Plus size={16} />
          {t("Add Product")}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-4 shadow-sm"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Product Name")}</label>
            <input
              required
              placeholder={t("e.g. Wireless Mouse")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("SKU")}</label>
            <input
              placeholder={t("e.g. TECH-MSE-01")}
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Unit Price")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              placeholder="0.00"
              value={form.unit_price || ""}
              onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) || 0 })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Tax Rate")}</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder={t("e.g. 18")}
              value={form.tax_rate || ""}
              onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) || 0 })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Stock Qty")}</label>
            <input
              type="number"
              min={0}
              placeholder={t("e.g. 100")}
              value={form.stock_quantity || ""}
              onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) || 0 })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Unit")}</label>
            <input
              placeholder={t("e.g. pcs, box, kg")}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Description")}</label>
            <textarea
              placeholder={t("Add product specifications or notes...")}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand h-20 resize-none"
            />
          </div>
          <div className="sm:col-span-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={createProduct.isPending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {createProduct.isPending ? t("Saving…") : t("Save Product")}
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("Search products by name…")}
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand shadow-sm"
        />
      </div>

      {canImportProducts ? (
        <form onSubmit={handleImportSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{t("Import Products")}</h2>
              <p className="text-sm text-slate-500">{t("Upload a CSV file to bulk import products.")}</p>
            </div>
            <button
              type="submit"
              disabled={!file || importProducts.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              <Upload size={16} />
              {importProducts.isPending ? t("Importing…") : t("Import products")}
            </button>
          </div>
          <label className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500 hover:border-slate-400 hover:bg-slate-50 cursor-pointer">
            <input
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  const ext = file.name.split('.').pop()?.toLowerCase();
                  if (ext !== 'csv') {
                    toast.error('Only CSV files are allowed.');
                    setFile(null);
                    return;
                  }
                  setFile(file);
                }
              }}
            />
            <div className="space-y-2">
              <p className="font-medium text-slate-700">{t("Drag and drop a CSV file here, or click to select a file.")}</p>
              <p className="text-xs text-slate-400">
                {t("Required columns: name, sku, description, unit_price, tax_rate, stock_quantity, unit")}
              </p>
              {file && (
                <p className="text-sm text-slate-600">
                  {t("Selected file:")} <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>
          </label>
        </form>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-900">{t("Import Products")}</h2>
          <p className="mt-2">{t("You do not have permission to import products. Contact your administrator to request the products.import permission.")}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">{t("SKU")}</th>
              <th className="px-4 py-3">{t("Product Name")}</th>
              <th className="px-4 py-3 text-right">{t("Unit Price")}</th>
              <th className="px-4 py-3 text-right">{t("Tax Rate")}</th>
              <th className="px-4 py-3 text-right">{t("Stock Status")}</th>
              <th className="w-24 px-4 py-3 text-center">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No products found matching your search.")}
                </td>
              </tr>
            ) : (
              data?.items.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/65 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.sku || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{p.name}</p>
                    {p.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>}
                  </td>
                  <td className="figures px-4 py-3 text-right font-medium text-ink-900">{formatMoney(p.unit_price)}</td>
                  <td className="figures px-4 py-3 text-right text-slate-500">{p.tax_rate}%</td>
                  <td className="figures px-4 py-3 text-right text-slate-500">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.stock_quantity === 0
                          ? "bg-danger-light text-danger"
                          : p.stock_quantity <= 5
                          ? "bg-warn-light text-warn"
                          : "bg-success-light text-success"
                      }`}
                    >
                      {p.stock_quantity} {p.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEditClick(p)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900 transition-colors"
                        aria-label={t("Edit product")}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-danger-light hover:text-danger transition-colors"
                        aria-label={t("Delete product")}
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

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            {t("Previous")}
          </button>
          <span className="text-sm text-slate-500">
            {t("Page")} {data.page} {t("of")} {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            {t("Next")}
          </button>
        </div>
      )}

      <Modal
        isOpen={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
        title={t("Edit Product")}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Product Name")}</label>
            <input
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("SKU")}</label>
              <input
                value={editForm.sku}
                onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Unit")}</label>
              <input
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Unit Price")}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={editForm.unit_price || ""}
                onChange={(e) => setEditForm({ ...editForm, unit_price: Number(e.target.value) || 0 })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Tax Rate")}</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={editForm.tax_rate || ""}
                onChange={(e) => setEditForm({ ...editForm, tax_rate: Number(e.target.value) || 0 })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Stock Qty")}</label>
              <input
                type="number"
                min={0}
                value={editForm.stock_quantity || ""}
                onChange={(e) => setEditForm({ ...editForm, stock_quantity: Number(e.target.value) || 0 })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t("Description")}</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand h-20 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={updateProduct.isPending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {updateProduct.isPending ? t("Saving…") : t("Save Changes")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}