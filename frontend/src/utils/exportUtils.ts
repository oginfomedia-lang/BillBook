// src/utils/exportUtils.ts

import toast from "react-hot-toast";

export type ExportFormat = "copy" | "csv" | "excel" | "pdf" | "print";

export function handleExport(
  data: any[],
  columns: { header: string; key: string | ((row: any) => any) }[],
  format: ExportFormat,
  filename: string = "export"
) {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  // Generate matrix of text data
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      let val = typeof col.key === "function" ? col.key(row) : row[col.key];
      if (val === null || val === undefined) val = "";
      return String(val).replace(/"/g, '""'); // Escape quotes
    })
  );

  if (format === "copy") {
    const text = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Copied to clipboard!"))
      .catch(() => toast.error("Failed to copy to clipboard"));
    return;
  }

  if (format === "csv" || format === "excel") {
    const csvContent =
      [headers.join(","), ...rows.map((r) => `"${r.join('","')}"`)].join("\n");
    
    // Add BOM for Excel UTF-8 support
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  if (format === "print" || format === "pdf") {
    if (format === "pdf") {
      toast("Select 'Save as PDF' in the print dialog.", { icon: "🖨️" });
    }
    window.print();
    return;
  }
}
