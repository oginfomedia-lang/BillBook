import { useState, useMemo } from "react";
import { Search, Copy, Download, Printer, Columns2 } from "lucide-react";
import toast from "react-hot-toast";
import type { StockAlertItem } from "../../types";
import { useTranslation } from "../../context/LanguageContext";

interface StockAlertTableProps {
  items: StockAlertItem[];
  threshold: number;
  isLoading?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function copyToClipboard(rows: StockAlertItem[]) {
  const header = "#\tItem Name\tSKU\tStock\tUnit";
  const body = rows
    .map((r, i) => `${i + 1}\t${r.name}\t${r.sku || "-"}\t${r.stock_quantity}\t${r.unit}`)
    .join("\n");
  navigator.clipboard.writeText(`${header}\n${body}`).then(() =>
    toast.success("Table copied to clipboard!")
  );
}

function downloadCSV(rows: StockAlertItem[], filename: string) {
  const header = `#,Item Name,SKU,Stock,Unit`;
  const body = rows
    .map((r, i) => `${i + 1},"${r.name}","${r.sku || ""}",${r.stock_quantity},"${r.unit}"`)
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function StockAlertTable({ items, threshold, isLoading }: StockAlertTableProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      items.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          (r.sku || "").toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const from = filtered.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(safePage * pageSize, filtered.length);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        {/* Show entries */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-auto">
          <span>{t("Show")}</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span>{t("entries")}</span>
        </div>

        {/* Export buttons */}
        <button
          onClick={() => copyToClipboard(filtered)}
          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-colors"
          title="Copy to clipboard"
        >
          <Copy size={12} /> {t("Copy")}
        </button>
        <button
          onClick={() => downloadCSV(filtered, "stock_alert.csv")}
          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-colors"
          title="Download Excel/CSV"
        >
          <Download size={12} /> {t("Excel")}
        </button>
        <button
          onClick={() => downloadCSV(filtered, "stock_alert.csv")}
          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-colors"
          title="Download CSV"
        >
          <Download size={12} /> {t("CSV")}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-colors"
          title="Print"
        >
          <Printer size={12} /> {t("Print")}
        </button>
        <button
          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          title="Column visibility"
        >
          <Columns2 size={12} /> {t("Columns")}
        </button>

        {/* Search */}
        <div className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1">
          <Search size={12} className="text-slate-400" />
          <input
            type="text"
            placeholder={t("Search...")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-28 bg-transparent text-xs text-ink-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Item Name")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("SKU")}</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Stock")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Unit")}</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm italic text-slate-400">
                  {search ? t("No matching records found") : t("All products are above the threshold-unit threshold.")}
                </td>
              </tr>
            ) : (
              slice.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-50 transition-colors hover:bg-slate-50 ${
                    idx % 2 === 1 ? "bg-slate-50/50" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-slate-400">{(safePage - 1) * pageSize + idx + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-brand hover:underline cursor-pointer">{item.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{item.sku || "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        item.stock_quantity === 0
                          ? "bg-danger-light text-danger"
                          : "bg-warn-light text-warn"
                      }`}
                    >
                      {item.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{item.unit}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <p className="text-xs text-slate-500">
          {t("Showing")} {from} {t("to")} {to} {t("of")} {filtered.length} {t("entries")}
          {search && ` (${t("filtered")} ${t("of")} ${items.length} ${t("entries")})`}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("Previous")}
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                p === safePage
                  ? "border-brand bg-brand text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
