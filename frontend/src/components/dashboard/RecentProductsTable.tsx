import type { RecentProduct } from "../../types";
import { formatMoney } from "../../utils/format";
import { Link } from "react-router-dom";
import { useTranslation } from "../../context/LanguageContext";

interface RecentProductsTableProps {
  products: RecentProduct[];
  isLoading?: boolean;
}

export function RecentProductsTable({ products, isLoading }: RecentProductsTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        {t("No products yet. Add your first product to see it here.")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("Sl.No")}
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("Item Name")}
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("Sales Price")}
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, idx) => (
            <tr
              key={product.id}
              className="border-b border-slate-50 transition-colors hover:bg-slate-50"
            >
              <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-2.5">
                <Link
                  to="/items"
                  className="font-medium text-brand hover:underline"
                >
                  {product.name}
                </Link>
              </td>
              <td className="figures px-4 py-2.5 text-right font-medium text-ink-900">
                {formatMoney(product.unit_price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
