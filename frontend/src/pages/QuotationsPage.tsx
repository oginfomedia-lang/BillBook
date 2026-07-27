import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, FileText } from "lucide-react";
import { useQuotations } from "../hooks/useQuotations";
import { useWarehouses } from "../hooks/useWarehouses";
import { TableSkeleton } from "../components/ui/Skeletons";
import { ExportToolbar, type ColumnDef } from "../components/ui/ExportToolbar";
import { formatMoney, formatDate } from "../utils/format";
import type { PaginatedResponse } from "../types";
import type { QuotationStatus } from "../api/quotations";

const STATUS_FILTERS: { label: string; value: QuotationStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Accepted", value: "accepted" },
  { label: "Declined", value: "declined" },
];

const QUOTATION_COLUMNS: ColumnDef[] = [
  { key: "quotation_number", label: "Quotation", visible: true },
  { key: "customer", label: "Customer", visible: true },
  { key: "warehouse", label: "Warehouse", visible: true },
  { key: "issue_date", label: "Date", visible: true },
  { key: "grand_total", label: "Amount", visible: true },
  { key: "status", label: "Status", visible: true },
];

export function QuotationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QuotationStatus | "">("");
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [columns, setColumns] = useState<ColumnDef[]>(QUOTATION_COLUMNS);
  const { data: warehousesData } = useWarehouses({ page: 1, per_page: 100 });

  const { data, isLoading } = useQuotations({
    page,
    search,
    status: status || undefined,
    warehouse_id: warehouseId || undefined,
  });
  const quotations = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Quotations</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} total</p>
        </div>
        <Link
          to="/quotations/new"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={16} /> New Quotation
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search quotations…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value ? Number(e.target.value) : "");
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">All warehouses</option>
            {warehousesData?.items.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5 overflow-x-auto">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setStatus(filter.value);
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                  status === filter.value
                    ? "bg-ink-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{data?.total ?? 0} records</span>
        <ExportToolbar
          data={(data?.items ?? []).map((q) => ({
            quotation_number: q.quotation_number,
            customer: q.customer?.name ?? "",
            warehouse: q.warehouse?.name ?? "",
            issue_date: formatDate(q.issue_date),
            grand_total: q.grand_total,
            status: q.status,
          }))}
          columns={columns}
          onColumnsChange={setColumns}
          filename="quotations-list"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">Quotation</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">T&C</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={6} cols={7} />
            ) : quotations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No quotations match this filter.
                </td>
              </tr>
            ) : (
              quotations.map((quotation) => (
                <tr key={quotation.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-brand hover:underline">
                    <Link to={`/quotations/${quotation.id}`}>{quotation.quotation_number}</Link>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{quotation.customer?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{quotation.warehouse?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(quotation.issue_date)}</td>
                  <td className="figures px-4 py-3 text-right font-medium text-ink-900">
                    {formatMoney(quotation.grand_total)}
                  </td>
                  <td className="px-4 py-3 capitalize">{quotation.status}</td>
                  <td className="px-4 py-3 text-center">
                    {quotation.terms_conditions ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <FileText size={12} />
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
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
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {data.page} of {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}