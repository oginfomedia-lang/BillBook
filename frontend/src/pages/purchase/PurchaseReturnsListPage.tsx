// src/pages/purchase/PurchaseReturnsListPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  DollarSign,
  CreditCard,
  MinusCircle,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { DemoGuard } from "../../components/DemoGuard";
import {
  listPurchaseReturns,
  getPurchaseReturnStats,
  deletePurchaseReturn,
  type PurchaseReturn,
  type PurchaseStats,
} from "../../api/purchases";
import { listWarehouses, type Warehouse } from "../../api/warehouses";
import { formatMoney, formatDate } from "../../utils/format";

// -------------------------------------------------------------------
// Stat Card
// -------------------------------------------------------------------
function StatCard({
  icon: Icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ElementType;
  iconBg: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={26} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Status Badges
// -------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    approved: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    partial: "bg-amber-100 text-amber-700 border border-amber-200",
    pending: "bg-red-100 text-red-700 border border-red-200",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

// -------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------
export function PurchaseReturnsListPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const PER_PAGE = 10;

  useEffect(() => {
    listWarehouses({ per_page: 100 }).then((res) => setWarehouses(res.items));
  }, []);

  useEffect(() => {
    const wid = warehouseId !== "" ? warehouseId : undefined;
    setLoading(true);
    Promise.all([
      getPurchaseReturnStats({ warehouse_id: wid }),
      listPurchaseReturns({ page, per_page: PER_PAGE, search: search || undefined, warehouse_id: wid }),
    ])
      .then(([s, r]) => {
        setStats(s);
        setReturns(r.items);
        setTotal(r.total);
        setPages(r.pages);
      })
      .catch(() => toast.error("Failed to load purchase returns"))
      .finally(() => setLoading(false));
  }, [page, search, warehouseId]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this return? Stock will be restored.")) return;
    setDeletingId(id);
    try {
      await deletePurchaseReturn(id);
      toast.success("Return deleted");
      setReturns((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => prev - 1);
      const wid = warehouseId !== "" ? warehouseId : undefined;
      const s = await getPurchaseReturnStats({ warehouse_id: wid });
      setStats(s);
    } catch {
      toast.error("Could not delete return");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-brand" onClick={() => navigate("/dashboard")}>
          Home
        </span>
        <ChevronRight size={12} />
        <span className="font-medium text-slate-700">Purchase Returns List</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Purchase Returns List</h1>
        <p className="text-xs text-slate-500">View / Search Purchase Returns</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          iconBg="bg-[#1e6fa8]"
          label="Total Invoices"
          value={stats?.total_invoices ?? 0}
        />
        <StatCard
          icon={DollarSign}
          iconBg="bg-[#1e6fa8]"
          label="Total Invoices Amount"
          value={formatMoney(stats?.total_amount ?? 0)}
        />
        <StatCard
          icon={CreditCard}
          iconBg="bg-[#1e6fa8]"
          label="Total Returned Amount"
          value={formatMoney(stats?.total_paid ?? 0)}
        />
        <StatCard
          icon={MinusCircle}
          iconBg="bg-[#1e6fa8]"
          label="Total Purchase Due"
          value={formatMoney(stats?.total_due ?? 0)}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value === "" ? "" : Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">— All Warehouses —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search returns…"
              className="rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand w-52"
            />
          </div>
          <button
            onClick={() => navigate("/purchase/returns/new")}
            className="flex items-center gap-1.5 rounded-lg bg-[#1e6fa8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a5f90] transition-colors"
          >
            <Plus size={16} />
            Create New
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-[#1e6fa8] text-left text-xs font-semibold text-white">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Purchase Code</th>
              <th className="px-4 py-3">Return Code</th>
              <th className="px-4 py-3">Return Status</th>
              <th className="px-4 py-3">Reference No.</th>
              <th className="px-4 py-3">Supplier Name</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Paid Payment</th>
              <th className="px-4 py-3">Payment Status</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 animate-pulse">
                  {Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-400">
                  No data available in table
                </td>
              </tr>
            ) : (
              returns.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.return_date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{r.purchase_code || "—"}</td>
                  <td className="px-4 py-3 font-medium text-[#1e6fa8]">{r.return_code}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{r.reference_no || "—"}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.supplier?.name || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {formatMoney(r.grand_total)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatMoney(r.amount_paid)}
                  </td>
                  <td className="px-4 py-3"><PaymentBadge status={r.payment_status} /></td>
                  <td className="px-4 py-3 text-slate-600">{r.creator_name || "—"}</td>
                  <td className="px-4 py-3">
                    <DemoGuard>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </DemoGuard>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-sm">
              <td colSpan={6} className="px-4 py-3 text-slate-700">Total</td>
              <td className="px-4 py-3 text-right text-slate-800">
                {formatMoney(returns.reduce((s, r) => s + r.grand_total, 0))}
              </td>
              <td className="px-4 py-3 text-right text-slate-800">
                {formatMoney(returns.reduce((s, r) => s + r.amount_paid, 0))}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {returns.length === 0 ? 0 : (page - 1) * PER_PAGE + 1} to{" "}
          {Math.min(page * PER_PAGE, total)} of {total} entries
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((v) => v - 1)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="rounded-lg border border-[#1e6fa8] bg-[#1e6fa8] px-3 py-1.5 text-sm font-bold text-white">
            {page}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((v) => v + 1)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40 hover:bg-slate-50"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
