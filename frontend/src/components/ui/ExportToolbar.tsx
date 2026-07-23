// src/components/ui/ExportToolbar.tsx
import { useRef, useState } from "react";
import { Copy, FileSpreadsheet, FileText, Printer, Download, Columns3, Check, X } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  visible?: boolean;
}

interface ExportToolbarProps {
  /** Raw data rows to export (array of objects). */
  data: Record<string, any>[];
  /** Column definitions for "Columns" panel. Pass undefined to hide the Columns button. */
  columns?: ColumnDef[];
  /** Called when column visibility changes. */
  onColumnsChange?: (columns: ColumnDef[]) => void;
  /** Human-readable filename prefix (e.g. "sales-list"). */
  filename?: string;
  /** Optional extra className for the toolbar wrapper. */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Leading characters spreadsheet apps (Excel/LibreOffice/Sheets) treat as
// "this cell is a formula". Any user-controlled string (customer/item names,
// notes, etc.) starting with one of these would otherwise be written as a
// LIVE formula and execute when the exported file is opened — classic
// CSV/formula injection (data exfiltration via HYPERLINK, etc.). Same fix
// already applied on the backend's report export (app/utils/report_export.py).
const FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@", "\t", "\r"];

function sanitizeForSpreadsheet(value: any): string {
  const v = String(value ?? "");
  return FORMULA_TRIGGER_CHARS.some((c) => v.startsWith(c)) ? `'${v}` : v;
}

// Escapes a value for safe interpolation into an HTML string. Without this,
// any field containing markup (e.g. a customer named "<script>...</script>")
// would execute as real script/HTML in the PDF export's document.write().
function escapeHtml(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rowsToCSV(data: Record<string, any>[], visibleKeys: string[]): string {
  if (!data.length) return "";
  const header = visibleKeys.join(",");
  const rows = data.map((row) =>
    visibleKeys
      .map((k) => {
        const v = sanitizeForSpreadsheet(row[k]);
        return v.includes(",") || v.includes('"') || v.includes("\n")
          ? `"${v.replace(/"/g, '""')}"`
          : v;
      })
      .join(",")
  );
  return [header, ...rows].join("\n");
}

function downloadFile(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Button ──────────────────────────────────────────────────────────────────

function Btn({
  label,
  color,
  icon: Icon,
  onClick,
}: {
  label: string;
  color: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 shadow-sm ${color}`}
    >
      <Icon size={13} />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label}</span>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ExportToolbar({
  data,
  columns,
  onColumnsChange,
  filename = "export",
  className = "",
}: ExportToolbarProps) {
  const [showColumns, setShowColumns] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const visibleKeys = columns
    ? columns.filter((c) => c.visible !== false).map((c) => c.key)
    : data.length
    ? Object.keys(data[0])
    : [];

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    const csv = rowsToCSV(data, visibleKeys);
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select from textarea
      const ta = document.createElement("textarea");
      ta.value = csv;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── CSV ───────────────────────────────────────────────────────────────────
  const handleCSV = () => {
    downloadFile(rowsToCSV(data, visibleKeys), `${filename}.csv`, "text/csv;charset=utf-8;");
  };

  // ── Excel (TSV wrapped in XLSX-friendly BOM) ──────────────────────────────
  const handleExcel = () => {
    // Simple TSV that Excel opens directly
    const tsv = [
      visibleKeys.join("\t"),
      ...data.map((row) => visibleKeys.map((k) => sanitizeForSpreadsheet(row[k])).join("\t")),
    ].join("\n");
    downloadFile(
      "\uFEFF" + tsv,
      `${filename}.xls`,
      "application/vnd.ms-excel;charset=utf-8;"
    );
  };

  // ── PDF ───────────────────────────────────────────────────────────────────
  const handlePDF = () => {
    if (!data.length) return;
    const rows = data
      .map(
        (row) =>
          `<tr>${visibleKeys
            .map(
              (k) =>
                `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${escapeHtml(row[k])}</td>`
            )
            .join("")}</tr>`
      )
      .join("");

    const safeFilename = escapeHtml(filename);
    const html = `
      <html>
        <head>
          <title>${safeFilename}</title>
          <style>
            body { font-family: sans-serif; color: #1e293b; margin: 24px; }
            h1 { font-size: 18px; margin-bottom: 16px; color: #0f172a; }
            table { border-collapse: collapse; width: 100%; }
            th { background: #1e293b; color: #fff; padding: 8px 10px; font-size: 11px; text-align: left; text-transform: uppercase; letter-spacing: .05em; }
            tr:nth-child(even) td { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>${safeFilename}</h1>
          <table>
            <thead><tr>${visibleKeys
              .map((k) => `<th>${escapeHtml(columns?.find((c) => c.key === k)?.label ?? k)}</th>`)
              .join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => handlePDF();

  // ── Column toggle ─────────────────────────────────────────────────────────
  const toggleColumn = (key: string) => {
    if (!columns || !onColumnsChange) return;
    const next = columns.map((c) =>
      c.key === key ? { ...c, visible: c.visible === false } : c
    );
    onColumnsChange(next);
  };

  return (
    <div className={`relative flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Copy */}
      <Btn
        label={copied ? "Copied!" : "Copy"}
        color={copied ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-600 hover:bg-slate-700"}
        icon={copied ? Check : Copy}
        onClick={handleCopy}
      />

      {/* Excel */}
      <Btn
        label="Excel"
        color="bg-emerald-600 hover:bg-emerald-700"
        icon={FileSpreadsheet}
        onClick={handleExcel}
      />

      {/* PDF */}
      <Btn
        label="PDF"
        color="bg-rose-600 hover:bg-rose-700"
        icon={FileText}
        onClick={handlePDF}
      />

      {/* Print */}
      <Btn
        label="Print"
        color="bg-sky-600 hover:bg-sky-700"
        icon={Printer}
        onClick={handlePrint}
      />

      {/* CSV */}
      <Btn
        label="CSV"
        color="bg-amber-500 hover:bg-amber-600"
        icon={Download}
        onClick={handleCSV}
      />

      {/* Columns toggle */}
      {columns && onColumnsChange && (
        <>
          <Btn
            label="Columns"
            color="bg-violet-600 hover:bg-violet-700"
            icon={Columns3}
            onClick={() => setShowColumns((v) => !v)}
          />

          {showColumns && (
            <div
              ref={panelRef}
              className="absolute right-0 top-9 z-50 w-56 rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <span className="text-xs font-semibold text-slate-700">Toggle Columns</span>
                <button
                  onClick={() => setShowColumns(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
              <ul className="max-h-72 overflow-y-auto p-2 space-y-0.5">
                {columns.map((col) => (
                  <li key={col.key}>
                    <button
                      type="button"
                      onClick={() => toggleColumn(col.key)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border text-white transition-colors ${
                          col.visible !== false
                            ? "border-brand bg-brand"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {col.visible !== false && <Check size={10} />}
                      </span>
                      {col.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
