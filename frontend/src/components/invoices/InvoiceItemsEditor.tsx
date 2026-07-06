import { AlertTriangle, Trash2, Plus } from "lucide-react";
import type { InvoiceItem, Product } from "../../types";
import { formatMoney } from "../../utils/format";
import { useTranslation } from "../../context/LanguageContext";

type StockTheme = "success" | "warning" | "danger";

interface InvoiceItemsEditorProps {
  items: InvoiceItem[];
  products: Product[];
  onChange: (items: InvoiceItem[]) => void;
  onProductSearch: (search: string) => void;
  itemErrors?: string[];
}

function lineTotal(item: InvoiceItem) {
  const subtotal = item.quantity * item.unit_price;
  const tax = subtotal * (item.tax_rate / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function InvoiceItemsEditor({ items, products, onChange, onProductSearch, itemErrors }: InvoiceItemsEditorProps) {
  const { t } = useTranslation();

  const updateItem = (index: number, patch: Partial<InvoiceItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const getStockMeta = (product: Product): { label: string; theme: StockTheme } => {
    const stock = product.stock_quantity;
    if (stock <= 0) return { label: "Out of Stock", theme: "danger" };
    if (stock < 20) return { label: `${stock} pcs available`, theme: "danger" };
    if (stock < 50) return { label: `${stock} pcs available`, theme: "warning" };
    return { label: `${stock} pcs available`, theme: "success" };
  };

  const stockColor = (theme: "success" | "warning" | "danger") =>
    theme === "success" ? "text-emerald-600" : theme === "warning" ? "text-amber-600" : "text-danger";

  const addItem = () => {
    onChange([...items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
            <th className="px-4 py-3">{t("Product")}</th>
            <th className="w-20 px-3 py-3">{t("Qty")}</th>
            <th className="w-28 px-3 py-3">{t("Unit Price")}</th>
            <th className="w-20 px-3 py-3">{t("Tax %")}</th>
            <th className="w-32 px-4 py-3 text-right">{t("Amount")}</th>
            <th className="w-32 px-4 py-3 text-right">{t("Total")}</th>
            <th className="w-10 px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const { total } = lineTotal(item);
            const product = products.find((product) => product.id === item.product_id);
            const currentStockMeta = product ? getStockMeta(product) : null;
            const hasError = itemErrors?.[index];
            const isApproachingLimit = product ? item.quantity >= Math.ceil(product.stock_quantity * 0.8) : false;
            return (
              <tr key={index} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2">
                  <input
                    list={`product-options-${index}`}
                    value={item.description}
                    onChange={(e) => {
                      const description = e.target.value;
                      const selectedProduct = products.find((product) => product.name === description);
                      updateItem(index, {
                        description,
                        product_id: selectedProduct?.id ?? null,
                        unit_price: selectedProduct ? selectedProduct.unit_price : item.unit_price,
                        tax_rate: selectedProduct ? selectedProduct.tax_rate : item.tax_rate,
                      });
                      onProductSearch(description);
                    }}
                    placeholder={t("Product")}
                    className="w-full rounded-md border-0 bg-transparent px-1 py-1.5 text-sm focus:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <datalist id={`product-options-${index}`}>
                    {products.map((product) => {
                      const meta = getStockMeta(product);
                      return <option key={product.id} value={product.name} label={`${product.name} (${meta.label})`} />;
                    })}
                  </datalist>
                  {currentStockMeta ? (
                    <div className={`mt-1 flex items-center gap-1 text-xs ${stockColor(currentStockMeta.theme)}`}>
                      {currentStockMeta.theme !== "success" ? <AlertTriangle size={14} /> : null}
                      <span>{currentStockMeta.label}</span>
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={item.quantity === 0 ? "" : item.quantity}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, "");
                      const targetQuantity = raw === "" ? 0 : Number(raw);
                      const clampedQuantity = product
                        ? product.stock_quantity <= 0
                          ? 0
                          : Math.min(targetQuantity, product.stock_quantity)
                        : targetQuantity;
                      updateItem(index, {
                        quantity: clampedQuantity,
                      });
                    }}
                    className={`figures w-full rounded-md border px-1 py-1.5 text-sm focus:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand ${
                      hasError ? "border-danger bg-danger-light/10" : "border-transparent bg-transparent"
                    }`}
                  />
                  {hasError ? <div className="mt-1 text-xs text-danger">{hasError}</div> : null}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) || 0 })}
                    className="figures w-full rounded-md border-0 bg-transparent px-1 py-1.5 text-sm focus:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={item.tax_rate}
                    onChange={(e) => updateItem(index, { tax_rate: Number(e.target.value) || 0 })}
                    className="figures w-full rounded-md border-0 bg-transparent px-1 py-1.5 text-sm focus:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </td>
                <td className="figures px-4 py-2 text-right font-medium text-ink-900">
                  {formatMoney(item.quantity * item.unit_price)}
                </td>
                <td className="figures px-4 py-2 text-right font-medium text-ink-900">
                  {formatMoney(total)}
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-danger-light hover:text-danger"
                    aria-label={t("Remove line item")}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        type="button"
        onClick={addItem}
        className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 px-4 py-3 text-sm font-medium text-brand hover:bg-brand-light/40"
      >
        <Plus size={16} />
        {t("Add line item")}
      </button>
    </div>
  );
}