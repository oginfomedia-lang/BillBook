import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FileText,
  FileType,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Layers,
  Calendar,
  Filter,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { apiClient } from "../api/client";
import { useBranch } from "../context/BranchContext";
import { useCustomers } from "../hooks/useCustomers";
import { useSuppliers } from "../hooks/useSuppliers";
import { useExpenseCategories } from "../hooks/useExpenses";
import { useTranslation } from "../context/LanguageContext";
import { formatMoney } from "../utils/format";

type ReportTab = "sales" | "purchases" | "expenses" | "profit_loss" | "stock" | "sales_returns" | "purchase_returns" | "customer_orders" | "supplier_items" | "sales_payments" | "purchase_payments" | "stock_transfers";

export function ReportsPage() {
  const { t } = useTranslation();
  const { currentBranchId, branches } = useBranch();
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") || "sales") as ReportTab;

  const REPORT_LABELS: Record<ReportTab, string> = {
    sales: "Sales Report",
    purchases: "Purchase Report",
    expenses: "Expense Report",
    profit_loss: "Profit & Loss Report",
    stock: "Stock Report",
    sales_returns: "Sales Return Report",
    purchase_returns: "Purchase Return Report",
    customer_orders: "Customer Orders",
    supplier_items: "Supplier Items Report",
    sales_payments: "Sales Payments Report",
    purchase_payments: "Purchase Payments Report",
    stock_transfers: "Stock Transfer Report",
  };

  // Filters state
  const [dateRange, setDateRange] = useState("this_month"); // "today" | "this_week" | "this_month" | "custom"
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Start of month
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [selectedBranch, setSelectedBranch] = useState<string>(
    currentBranchId ? String(currentBranchId) : "all"
  );
  const [customerId, setCustomerId] = useState<string>("all");
  const [supplierId, setSupplierId] = useState<string>("all");
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>("all");
  const [invoiceStatus, setInvoiceStatus] = useState<string>("all");

  // Load filter helper data
  const { data: customersData } = useCustomers({ per_page: 100 });
  const { data: suppliersData } = useSuppliers({ per_page: 100 });
  const { data: categoriesData } = useExpenseCategories();

  // Helper to build params
  const getParams = () => {
    const params: Record<string, any> = {};
    if (selectedBranch !== "all") {
      params.branch_id = selectedBranch;
    }
    // Calculate dates based on preset
    let start = startDate;
    let end = endDate;
    const today = new Date();
    if (dateRange === "today") {
      start = today.toISOString().split("T")[0];
      end = start;
    } else if (dateRange === "this_week") {
      const first = today.getDate() - today.getDay();
      start = new Date(today.setDate(first)).toISOString().split("T")[0];
      end = new Date().toISOString().split("T")[0];
    } else if (dateRange === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = firstDay.toISOString().split("T")[0];
      end = new Date().toISOString().split("T")[0];
    }
    params.start_date = start;
    params.end_date = end;
    return params;
  };

  // Queries for tab data
  const salesReportQuery = useQuery({
    queryKey: ["reports", "sales", getParams(), customerId, invoiceStatus],
    queryFn: async () => {
      const params = getParams();
      if (customerId !== "all") params.customer_id = customerId;
      if (invoiceStatus !== "all") params.status = invoiceStatus;
      const { data } = await apiClient.get("/reports/sales", { params });
      return data;
    },
    enabled: activeTab === "sales",
  });

  const purchasesReportQuery = useQuery({
    queryKey: ["reports", "purchases", getParams(), supplierId],
    queryFn: async () => {
      const params = getParams();
      if (supplierId !== "all") params.supplier_id = supplierId;
      const { data } = await apiClient.get("/reports/purchases", { params });
      return data;
    },
    enabled: activeTab === "purchases",
  });

  const expensesReportQuery = useQuery({
    queryKey: ["reports", "expenses", getParams(), expenseCategoryId],
    queryFn: async () => {
      const params = getParams();
      if (expenseCategoryId !== "all") params.category_id = expenseCategoryId;
      const { data } = await apiClient.get("/reports/expenses", { params });
      return data;
    },
    enabled: activeTab === "expenses",
  });

  const profitLossReportQuery = useQuery({
    queryKey: ["reports", "profit-loss", getParams()],
    queryFn: async () => {
      const { data } = await apiClient.get("/reports/profit-loss", { params: getParams() });
      return data;
    },
    enabled: activeTab === "profit_loss",
  });

  const stockReportQuery = useQuery({
    queryKey: ["reports", "stock", selectedBranch],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (selectedBranch !== "all") params.branch_id = selectedBranch;
      const { data } = await apiClient.get("/reports/stock", { params });
      return data;
    },
    enabled: activeTab === "stock",
  });

  const salesReturnsQuery = useQuery({
    queryKey: ["reports", "sales-returns", getParams(), customerId],
    queryFn: async () => {
      const params = getParams();
      if (customerId !== "all") params.customer_id = customerId;
      const { data } = await apiClient.get("/reports/sales-returns", { params });
      return data;
    },
    enabled: activeTab === "sales_returns",
  });

  const purchaseReturnsQuery = useQuery({
    queryKey: ["reports", "purchase-returns", getParams(), supplierId],
    queryFn: async () => {
      const params = getParams();
      if (supplierId !== "all") params.supplier_id = supplierId;
      const { data } = await apiClient.get("/reports/purchase-returns", { params });
      return data;
    },
    enabled: activeTab === "purchase_returns",
  });

  const customerOrdersQuery = useQuery({
    queryKey: ["reports", "customer-orders", getParams(), customerId],
    queryFn: async () => {
      const params = getParams();
      if (customerId !== "all") params.customer_id = customerId;
      const { data } = await apiClient.get("/reports/customer-orders", { params });
      return data;
    },
    enabled: activeTab === "customer_orders",
  });

  const supplierItemsQuery = useQuery({
    queryKey: ["reports", "supplier-items", getParams(), supplierId],
    queryFn: async () => {
      const params = getParams();
      if (supplierId !== "all") params.supplier_id = supplierId;
      const { data } = await apiClient.get("/reports/supplier-items", { params });
      return data;
    },
    enabled: activeTab === "supplier_items",
  });

  const salesPaymentsQuery = useQuery({
    queryKey: ["reports", "sales-payments", getParams(), customerId],
    queryFn: async () => {
      const params = getParams();
      if (customerId !== "all") params.customer_id = customerId;
      const { data } = await apiClient.get("/reports/sales-payments", { params });
      return data;
    },
    enabled: activeTab === "sales_payments",
  });

  const purchasePaymentsQuery = useQuery({
    queryKey: ["reports", "purchase-payments", getParams(), supplierId],
    queryFn: async () => {
      const params = getParams();
      if (supplierId !== "all") params.supplier_id = supplierId;
      const { data } = await apiClient.get("/reports/purchase-payments", { params });
      return data;
    },
    enabled: activeTab === "purchase_payments",
  });

  const stockTransfersQuery = useQuery({
    queryKey: ["reports", "stock-transfers", getParams()],
    queryFn: async () => {
      const { data } = await apiClient.get("/reports/stock-transfers", { params: getParams() });
      return data;
    },
    enabled: activeTab === "stock_transfers",
  });

  // Client-side CSV Exporter
  const handleExportCSV = (filename: string, headers: string[], rows: any[][]) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";
    rows.forEach((row) => {
      const formatted = row.map((val) => {
        if (typeof val === "string") {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvContent += formatted.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Mirrors the extra filter each tab's useQuery layers on top of getParams(),
  // so the exported file matches exactly what's on screen.
  const getExportParams = () => {
    const params = getParams();
    switch (activeTab) {
      case "sales":
      case "sales_returns":
      case "customer_orders":
      case "sales_payments":
        if (customerId !== "all") params.customer_id = customerId;
        if (activeTab === "sales" && invoiceStatus !== "all") params.status = invoiceStatus;
        break;
      case "purchases":
      case "purchase_returns":
      case "supplier_items":
      case "purchase_payments":
        if (supplierId !== "all") params.supplier_id = supplierId;
        break;
      case "expenses":
        if (expenseCategoryId !== "all") params.category_id = expenseCategoryId;
        break;
      case "stock":
        return selectedBranch !== "all" ? { branch_id: selectedBranch } : {};
      default:
        break;
    }
    return params;
  };

  const [isExporting, setIsExporting] = useState<"pdf" | "excel" | null>(null);

  const handleExportFile = async (format: "pdf" | "excel") => {
    setIsExporting(format);
    try {
      const response = await apiClient.get("/reports/export", {
        params: { ...getExportParams(), type: activeTab, format },
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${activeTab}_report.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error(t("Couldn't export the report. Please try again."));
    } finally {
      setIsExporting(null);
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t(REPORT_LABELS[activeTab])}</h1>
          <p className="text-sm text-slate-500">{t("Gain deep financial and operational insights.")}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportFile("pdf")}
            disabled={isExporting !== null}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileType size={14} />
            {isExporting === "pdf" ? t("Exporting…") : t("Export PDF")}
          </button>
          <button
            onClick={() => handleExportFile("excel")}
            disabled={isExporting !== null}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileSpreadsheet size={14} />
            {isExporting === "excel" ? t("Exporting…") : t("Export Excel")}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer size={14} />
            {t("Print Report")}
          </button>
        </div>
      </div>


      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("Filters")}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Branch Filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("Branch")}</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="all">{t("All Branches")}</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range picker (Disabled on Stock Tab) */}
          {activeTab !== "stock" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("Period")}</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="today">{t("Today")}</option>
                  <option value="this_week">{t("This Week")}</option>
                  <option value="this_month">{t("This Month")}</option>
                  <option value="custom">{t("Custom Date Range")}</option>
                </select>
              </div>

              {dateRange === "custom" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">{t("From")}</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">{t("To")}</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Tab-specific Filters */}
          {activeTab === "sales" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("Customer")}</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">{t("All Customers")}</option>
                  {customersData?.items?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("Status")}</label>
                <select
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">{t("All Statuses")}</option>
                  <option value="paid">{t("Paid")}</option>
                  <option value="pending">{t("Pending")}</option>
                  <option value="overdue">{t("Overdue")}</option>
                  <option value="cancelled">{t("Cancelled")}</option>
                </select>
              </div>
            </>
          )}

          {activeTab === "purchases" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{t("Supplier")}</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="all">{t("All Suppliers")}</option>
                {suppliersData?.items?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "expenses" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{t("Category")}</label>
              <select
                value={expenseCategoryId}
                onChange={(e) => setExpenseCategoryId(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="all">{t("All Categories")}</option>
                {categoriesData?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
        <h1 className="text-xl font-bold text-ink-900">BillBook Workspace Report</h1>
        <p className="text-xs text-slate-500">
          Generated on: {new Date().toLocaleDateString()} | Tab:{" "}
          {activeTab === "sales"
            ? "Sales Report"
            : activeTab === "purchases"
            ? "Purchase Report"
            : activeTab === "expenses"
            ? "Expense Report"
            : activeTab === "profit_loss"
            ? "Profit & Loss Statement"
            : "Stock & Inventory Report"}
        </p>
      </div>

      {/* ── SALES TAB CONTENT ─────────────────────────────────── */}
      {activeTab === "sales" && salesReportQuery.data && (
        <div className="space-y-6">
          {/* KPI summaries */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { label: "Total Sales", val: salesReportQuery.data.summary.total_sales, tone: "text-brand" },
              { label: "Total Paid", val: salesReportQuery.data.summary.total_paid, tone: "text-green-600" },
              { label: "Total Due", val: salesReportQuery.data.summary.total_due, tone: "text-red-500" },
              { label: "Tax Collected", val: salesReportQuery.data.summary.total_tax, tone: "text-slate-700" },
              { label: "Discount Given", val: salesReportQuery.data.summary.total_discount, tone: "text-purple-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t(kpi.label)}</p>
                <p className={`mt-2 text-lg font-bold ${kpi.tone}`}>{formatMoney(kpi.val)}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {salesReportQuery.data.chart_data.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm print:hidden">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">{t("Sales Trend")}</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesReportQuery.data.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip formatter={(value) => formatMoney(value as number)} />
                    <Line type="monotone" dataKey="amount" stroke="#0f766e" strokeWidth={2} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed list table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-5 py-3">Invoice No</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Subtotal</th>
                    <th className="px-5 py-3">Tax</th>
                    <th className="px-5 py-3">Discount</th>
                    <th className="px-5 py-3">Grand Total</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Due</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReportQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-10 text-center text-slate-400">
                        {t("No sales record matches selection")}
                      </td>
                    </tr>
                  ) : (
                    salesReportQuery.data.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-semibold text-brand">{item.invoice_number}</td>
                        <td className="px-5 py-3 text-ink-900">{item.customer?.name || "-"}</td>
                        <td className="px-5 py-3 text-slate-500">{item.issue_date}</td>
                        <td className="px-5 py-3 text-ink-900">{formatMoney(item.subtotal)}</td>
                        <td className="px-5 py-3 text-slate-500">{formatMoney(item.tax_total)}</td>
                        <td className="px-5 py-3 text-slate-500">{formatMoney(item.discount_total)}</td>
                        <td className="px-5 py-3 font-medium text-ink-900">{formatMoney(item.grand_total)}</td>
                        <td className="px-5 py-3 text-green-600 font-medium">{formatMoney(item.amount_paid)}</td>
                        <td className="px-5 py-3 text-red-500 font-medium">{formatMoney(item.balance_due)}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              item.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : item.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : item.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {t(item.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PURCHASES TAB CONTENT ──────────────────────────────── */}
      {activeTab === "purchases" && purchasesReportQuery.data && (
        <div className="space-y-6">
          {/* KPI summaries */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Purchases", val: purchasesReportQuery.data.summary.total_purchases, tone: "text-brand" },
              { label: "Total Paid", val: purchasesReportQuery.data.summary.total_paid, tone: "text-green-600" },
              { label: "Total Due", val: purchasesReportQuery.data.summary.total_due, tone: "text-red-500" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t(kpi.label)}</p>
                <p className={`mt-2 text-lg font-bold ${kpi.tone}`}>{formatMoney(kpi.val)}</p>
              </div>
            ))}
          </div>

          {/* Purchases table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-5 py-3">Purchase ID</th>
                    <th className="px-5 py-3">Supplier</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Grand Total</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Due</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchasesReportQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                        {t("No purchase records match selection")}
                      </td>
                    </tr>
                  ) : (
                    purchasesReportQuery.data.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-semibold text-brand">#{item.id}</td>
                        <td className="px-5 py-3 text-ink-900">{item.supplier?.name || "-"}</td>
                        <td className="px-5 py-3 text-slate-500">{item.purchase_date}</td>
                        <td className="px-5 py-3 font-medium text-ink-900">{formatMoney(item.grand_total)}</td>
                        <td className="px-5 py-3 text-green-600 font-medium">{formatMoney(item.amount_paid)}</td>
                        <td className="px-5 py-3 text-red-500 font-medium">{formatMoney(item.grand_total - item.amount_paid)}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              item.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : item.status === "pending" || item.status === "partial"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {t(item.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPENSES TAB CONTENT ───────────────────────────────── */}
      {activeTab === "expenses" && expensesReportQuery.data && (
        <div className="space-y-6">
          {/* KPI summaries */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Total Expenses")}</p>
              <p className="mt-2 text-lg font-bold text-red-500">{formatMoney(expensesReportQuery.data.summary.total_expenses)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Transaction Count")}</p>
              <p className="mt-2 text-lg font-bold text-ink-900">{expensesReportQuery.data.summary.count}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Pie Chart of category expenses */}
            {expensesReportQuery.data.categories.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-1 print:hidden">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">{t("Expenses by Category")}</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesReportQuery.data.categories}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expensesReportQuery.data.categories.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatMoney(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Expenses list */}
            <div className={`rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm ${expensesReportQuery.data.categories.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Ref No</th>
                      <th className="px-5 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expensesReportQuery.data.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                          {t("No expenses matches selection")}
                        </td>
                      </tr>
                    ) : (
                      expensesReportQuery.data.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-semibold text-ink-900">{item.category?.name || t("Uncategorized")}</td>
                          <td className="px-5 py-3 text-slate-500">{item.expense_date}</td>
                          <td className="px-5 py-3 font-bold text-red-500">{formatMoney(item.amount)}</td>
                          <td className="px-5 py-3 text-slate-500">{item.reference_no || "-"}</td>
                          <td className="px-5 py-3 text-slate-400 truncate max-w-xs">{item.notes || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFIT & LOSS TAB CONTENT ───────────────────────────── */}
      {activeTab === "profit_loss" && profitLossReportQuery.data && (
        <div className="space-y-6">
          {/* Net Profit Header Bar */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <span className="text-sm font-bold text-slate-800">{t("Net Profit")}</span>
            <span className={`text-base font-bold px-3 py-1 rounded-md ${
              profitLossReportQuery.data.net_profit >= 0 ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"
            }`}>
              {formatMoney(profitLossReportQuery.data.net_profit)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* LEFT COLUMN: Purchases & Returns */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("Acquisitions & Cost")}</span>
                <button
                  onClick={() => {
                    const headers = ["Title", "Value"];
                    const d = profitLossReportQuery.data;
                    const rows = [
                      ["Opening Stock", d.opening_stock],
                      ["Total Purchase", d.total_purchase],
                      ["Total Purchase Tax", d.total_purchase_tax],
                      ["Total Other Charges of Purchase", 0.0],
                      ["Total Discount on Purchase", d.total_purchase_discount],
                      ["Paid Payment", d.purchase_paid],
                      ["Purchase Due", d.purchase_due],
                      ["Total Purchase Return", d.total_purchase_return],
                      ["Total Purchase Return Tax", d.total_purchase_return_tax],
                      ["Total Other Charges of Purchase Return", 0.0],
                      ["Total Discount on Purchase Return", 0.0],
                      ["Paid Payment", d.purchase_return_paid],
                      ["Purchase Return Due", d.purchase_return_due],
                    ];
                    handleExportCSV("Purchase_PL_Report", headers, rows);
                  }}
                  className="flex items-center gap-1 rounded bg-brand px-2 py-1 text-[10px] font-semibold text-white hover:bg-brand-dark transition-colors"
                >
                  <Download size={10} /> {t("Export")}
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {/* Opening Stock */}
                <div className="flex justify-between px-4 py-3">
                  <span className="font-semibold text-slate-700">{t("Opening Stock")}</span>
                  <span className="font-bold text-ink-900">{formatMoney(profitLossReportQuery.data.opening_stock)}</span>
                </div>

                {/* Purchase Section */}
                <div className="bg-slate-50/50 px-4 py-2 font-bold text-brand uppercase tracking-wider text-[10px]">
                  {t("Purchase")}
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Purchase")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_purchase)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Purchase Tax")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_purchase_tax)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Other Charges of Purchase")}</span>
                  <span className="font-medium text-slate-400">0.00</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Discount on Purchase")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_purchase_discount)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Paid Payment")}</span>
                  <span className="font-medium text-green-600">{formatMoney(profitLossReportQuery.data.purchase_paid)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6 bg-red-50/20">
                  <span className="font-semibold text-slate-700">{t("Purchase Due")}</span>
                  <span className="font-bold text-red-500">{formatMoney(profitLossReportQuery.data.purchase_due)}</span>
                </div>

                {/* Purchase Return Section */}
                <div className="bg-slate-50/50 px-4 py-2 font-bold text-brand uppercase tracking-wider text-[10px]">
                  {t("Purchase Return")}
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Purchase Return")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_purchase_return)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Purchase Return Tax")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_purchase_return_tax)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Other Charges of Purchase Return")}</span>
                  <span className="font-medium text-slate-400">0.00</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Discount on Purchase Return")}</span>
                  <span className="font-medium text-slate-400">0.00</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Paid Payment")}</span>
                  <span className="font-medium text-green-600">{formatMoney(profitLossReportQuery.data.purchase_return_paid)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="font-semibold text-slate-700">{t("Purchase Return Due")}</span>
                  <span className="font-bold text-red-500">{formatMoney(profitLossReportQuery.data.purchase_return_due)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Expenses, Sales & Returns */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("Revenue & Expense")}</span>
                <button
                  onClick={() => {
                    const headers = ["Title", "Value"];
                    const d = profitLossReportQuery.data;
                    const rows = [
                      ["Total Expense", d.total_expense],
                      ["Sales (Before Tax)", d.sales_before_tax],
                      ["Total Sales Tax", d.total_sales_tax],
                      ["Total Other Charges of Sales", 0.0],
                      ["Total Discount on Sales", d.total_discount_on_sales],
                      ["Coupon Discount", d.coupon_discount],
                      ["Total Sales", d.total_sales],
                      ["Paid Payment", d.sales_paid],
                      ["Sales Due", d.sales_due],
                      ["Total Sales Return", d.total_sales_return],
                      ["Total Sales Return Tax", d.total_sales_return_tax],
                      ["Total Other Charges of Sales Return", 0.0],
                      ["Coupon Discount", d.sales_return_coupon_discount],
                      ["Total Discount on Sales Return", d.total_discount_on_sales_return],
                      ["Return Total", d.sales_return_total],
                      ["Paid Payment", d.sales_return_paid],
                      ["Sales Return Due", d.sales_return_due],
                    ];
                    handleExportCSV("Sales_PL_Report", headers, rows);
                  }}
                  className="flex items-center gap-1 rounded bg-brand px-2 py-1 text-[10px] font-semibold text-white hover:bg-brand-dark transition-colors"
                >
                  <Download size={10} /> {t("Export")}
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {/* Total Expense */}
                <div className="flex justify-between px-4 py-3">
                  <span className="font-semibold text-slate-700">{t("Total Expense")}</span>
                  <span className="font-bold text-red-500">{formatMoney(profitLossReportQuery.data.total_expense)}</span>
                </div>

                {/* Sales Section */}
                <div className="bg-slate-50/50 px-4 py-2 font-bold text-brand uppercase tracking-wider text-[10px]">
                  {t("Sales")}
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Sales (Before Tax)")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.sales_before_tax)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Sales Tax")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_sales_tax)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Other Charges of Sales")}</span>
                  <span className="font-medium text-slate-400">0.00</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Discount on Sales")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_discount_on_sales)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Coupon Discount")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.coupon_discount)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6 bg-slate-100 font-bold">
                  <span className="text-slate-800">{t("Total Sales")}</span>
                  <span className="text-ink-900">{formatMoney(profitLossReportQuery.data.total_sales)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Paid Payment")}</span>
                  <span className="font-medium text-green-600">{formatMoney(profitLossReportQuery.data.sales_paid)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="font-semibold text-slate-700">{t("Sales Due")}</span>
                  <span className="font-bold text-red-500">{formatMoney(profitLossReportQuery.data.sales_due)}</span>
                </div>

                {/* Sales Return Section */}
                <div className="bg-slate-50/50 px-4 py-2 font-bold text-brand uppercase tracking-wider text-[10px]">
                  {t("Sales Return")}
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Sales Return")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_sales_return)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Sales Return Tax")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_sales_return_tax)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Other Charges of Sales Return")}</span>
                  <span className="font-medium text-slate-400">0.00</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Coupon Discount")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.sales_return_coupon_discount)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Total Discount on Sales Return")}</span>
                  <span className="font-medium text-ink-900">{formatMoney(profitLossReportQuery.data.total_discount_on_sales_return)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6 bg-slate-100 font-bold">
                  <span className="text-slate-800">{t("Return Total")}</span>
                  <span className="text-ink-900">{formatMoney(profitLossReportQuery.data.sales_return_total)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="text-slate-600">{t("Paid Payment")}</span>
                  <span className="font-medium text-green-600">{formatMoney(profitLossReportQuery.data.sales_return_paid)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 pl-6">
                  <span className="font-semibold text-slate-700">{t("Sales Return Due")}</span>
                  <span className="font-bold text-red-500">{formatMoney(profitLossReportQuery.data.sales_return_due)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── STOCK TAB CONTENT ──────────────────────────────────── */}
      {activeTab === "stock" && stockReportQuery.data && (
        <div className="space-y-6">
          {/* KPI summaries */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Total Items Listed")}</p>
              <p className="mt-2 text-lg font-bold text-brand">{stockReportQuery.data.summary.total_items}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Total Stock Value")}</p>
              <p className="mt-2 text-lg font-bold text-green-600">{formatMoney(stockReportQuery.data.summary.total_value)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Low Stock Warnings")}</p>
              <p className="mt-2 text-lg font-bold text-red-500">{stockReportQuery.data.summary.low_stock_count}</p>
            </div>
          </div>

          {/* Stock inventory list */}
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-5 py-3">Item Name</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Current Stock</th>
                    <th className="px-5 py-3">Alert Qty</th>
                    <th className="px-5 py-3">Sales Price</th>
                    <th className="px-5 py-3">Purchase Price</th>
                    <th className="px-5 py-3">Stock Value</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockReportQuery.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-10 text-center text-slate-400">
                        {t("No stock item matches selection")}
                      </td>
                    </tr>
                  ) : (
                    stockReportQuery.data.items.map((item: any) => (
                      <tr key={item.id} className={`hover:bg-slate-50/50 ${
                        item.stock_quantity === 0 ? "bg-red-50/30" : ""
                      }`}>
                        <td className="px-5 py-3 font-semibold text-ink-900">{item.name}</td>
                        <td className="px-5 py-3 text-slate-500 font-mono">{item.sku}</td>
                        <td className="px-5 py-3 text-slate-500">{item.category || "-"}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            item.type === "service"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className={`px-5 py-3 font-bold ${
                          item.stock_quantity === 0
                            ? "text-red-600"
                            : item.is_low
                            ? "text-amber-600"
                            : "text-green-600"
                        }`}>
                          {item.stock_quantity} {item.unit}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{item.alert_quantity ?? 0}</td>
                        <td className="px-5 py-3 text-slate-500">{formatMoney(item.unit_price)}</td>
                        <td className="px-5 py-3 text-slate-500">{formatMoney(item.purchase_price ?? 0)}</td>
                        <td className="px-5 py-3 font-bold text-ink-900">{formatMoney(item.value)}</td>
                        <td className="px-5 py-3">
                          {item.stock_quantity === 0 ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 uppercase tracking-wider">
                              {t("Out of Stock")}
                            </span>
                          ) : item.is_low ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                              {t("Low Stock")}
                            </span>
                          ) : (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 uppercase tracking-wider">
                              {t("OK")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SALES RETURNS TAB ─────────────────────────────────── */}
      {activeTab === "sales_returns" && salesReturnsQuery.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Returns")}</p>
              <p className="text-xl font-bold text-ink-900">{salesReturnsQuery.data.summary.total_returns}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Return Amount")}</p>
              <p className="text-xl font-bold text-red-500">{formatMoney(salesReturnsQuery.data.summary.total_amount)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Invoice #")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Customer")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Date")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Amount")}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Status")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Mode")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {salesReturnsQuery.data.items.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{t("No sales returns found.")}</td></tr>
                ) : salesReturnsQuery.data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-brand">{item.invoice_number}</td>
                    <td className="px-5 py-3 text-slate-700">{item.customer?.name || "-"}</td>
                    <td className="px-5 py-3 text-slate-500">{item.issue_date}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-500">{formatMoney(item.grand_total)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 uppercase">{item.status}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{item.payment_mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PURCHASE RETURNS TAB ──────────────────────────────── */}
      {activeTab === "purchase_returns" && purchaseReturnsQuery.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Returns")}</p>
              <p className="text-xl font-bold text-ink-900">{purchaseReturnsQuery.data.summary.total_returns}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Return Amount")}</p>
              <p className="text-xl font-bold text-red-500">{formatMoney(purchaseReturnsQuery.data.summary.total_amount)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Return Code")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Purchase Code")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Supplier")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Date")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Amount")}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchaseReturnsQuery.data.items.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{t("No purchase returns found.")}</td></tr>
                ) : purchaseReturnsQuery.data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-brand">{item.return_code}</td>
                    <td className="px-5 py-3 text-slate-600">{item.purchase_code}</td>
                    <td className="px-5 py-3 text-slate-700">{item.supplier?.name || "-"}</td>
                    <td className="px-5 py-3 text-slate-500">{item.return_date}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-500">{formatMoney(item.grand_total)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CUSTOMER ORDERS TAB ───────────────────────────────── */}
      {activeTab === "customer_orders" && customerOrdersQuery.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Customers")}</p>
              <p className="text-xl font-bold text-ink-900">{customerOrdersQuery.data.summary.total_customers}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Billed")}</p>
              <p className="text-xl font-bold text-green-600">{formatMoney(customerOrdersQuery.data.summary.total_billed)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Collected")}</p>
              <p className="text-xl font-bold text-brand">{formatMoney(customerOrdersQuery.data.summary.total_paid)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Due")}</p>
              <p className="text-xl font-bold text-red-500">{formatMoney(customerOrdersQuery.data.summary.total_due)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Customer Name")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Phone")}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Orders")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Total Billed")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Amount Paid")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Balance Due")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customerOrdersQuery.data.items.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{t("No customer data found.")}</td></tr>
                ) : customerOrdersQuery.data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-ink-900">{item.name}</td>
                    <td className="px-5 py-3 text-slate-500">{item.phone}</td>
                    <td className="px-5 py-3 text-center text-slate-700">{item.invoice_count}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-900">{formatMoney(item.total_billed)}</td>
                    <td className="px-5 py-3 text-right font-medium text-green-600">{formatMoney(item.total_paid)}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-500">{formatMoney(item.balance_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUPPLIER ITEMS TAB ────────────────────────────────── */}
      {activeTab === "supplier_items" && supplierItemsQuery.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Suppliers")}</p>
              <p className="text-xl font-bold text-ink-900">{supplierItemsQuery.data.summary.total_suppliers}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Purchased")}</p>
              <p className="text-xl font-bold text-ink-900">{formatMoney(supplierItemsQuery.data.summary.total_purchase)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Paid")}</p>
              <p className="text-xl font-bold text-green-600">{formatMoney(supplierItemsQuery.data.summary.total_paid)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Due")}</p>
              <p className="text-xl font-bold text-red-500">{formatMoney(supplierItemsQuery.data.summary.total_due)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Supplier Name")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Phone")}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Purchases")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Total Purchase")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Amount Paid")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Balance Due")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {supplierItemsQuery.data.items.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{t("No supplier data found.")}</td></tr>
                ) : supplierItemsQuery.data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-ink-900">{item.supplier_name}</td>
                    <td className="px-5 py-3 text-slate-500">{item.phone}</td>
                    <td className="px-5 py-3 text-center text-slate-700">{item.purchase_count}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-900">{formatMoney(item.total_purchase)}</td>
                    <td className="px-5 py-3 text-right font-medium text-green-600">{formatMoney(item.total_paid)}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-500">{formatMoney(item.balance_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SALES PAYMENTS TAB ────────────────────────────────── */}
      {activeTab === "sales_payments" && salesPaymentsQuery.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Invoices")}</p>
              <p className="text-xl font-bold text-ink-900">{salesPaymentsQuery.data.summary.total_invoices}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Collected")}</p>
              <p className="text-xl font-bold text-green-600">{formatMoney(salesPaymentsQuery.data.summary.total_collected)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Outstanding Due")}</p>
              <p className="text-xl font-bold text-red-500">{formatMoney(salesPaymentsQuery.data.summary.total_due)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Invoice #")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Customer")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Date")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Grand Total")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Amount Paid")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Balance Due")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Mode")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {salesPaymentsQuery.data.items.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">{t("No sales payments found.")}</td></tr>
                ) : salesPaymentsQuery.data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-brand">{item.invoice_number}</td>
                    <td className="px-5 py-3 text-slate-700">{item.customer?.name || "-"}</td>
                    <td className="px-5 py-3 text-slate-500">{item.issue_date}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-900">{formatMoney(item.grand_total)}</td>
                    <td className="px-5 py-3 text-right font-medium text-green-600">{formatMoney(item.amount_paid)}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-500">{formatMoney(item.balance_due)}</td>
                    <td className="px-5 py-3 text-slate-500">{item.payment_mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PURCHASE PAYMENTS TAB ─────────────────────────────── */}
      {activeTab === "purchase_payments" && purchasePaymentsQuery.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Purchases")}</p>
              <p className="text-xl font-bold text-ink-900">{purchasePaymentsQuery.data.summary.total_purchases}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Paid")}</p>
              <p className="text-xl font-bold text-green-600">{formatMoney(purchasePaymentsQuery.data.summary.total_paid)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Outstanding Due")}</p>
              <p className="text-xl font-bold text-red-500">{formatMoney(purchasePaymentsQuery.data.summary.total_due)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Purchase #")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Supplier")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Date")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Grand Total")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Amount Paid")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Balance Due")}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchasePaymentsQuery.data.items.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">{t("No purchase payments found.")}</td></tr>
                ) : purchasePaymentsQuery.data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-brand">{item.purchase_code}</td>
                    <td className="px-5 py-3 text-slate-700">{item.supplier?.name || "-"}</td>
                    <td className="px-5 py-3 text-slate-500">{item.purchase_date}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-900">{formatMoney(item.grand_total)}</td>
                    <td className="px-5 py-3 text-right font-medium text-green-600">{formatMoney(item.amount_paid)}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-500">{formatMoney(item.balance_due)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        item.payment_status === "paid" ? "bg-green-100 text-green-700"
                          : item.payment_status === "partial" ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>{item.payment_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STOCK TRANSFERS TAB ───────────────────────────────── */}
      {activeTab === "stock_transfers" && stockTransfersQuery.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Transfers")}</p>
              <p className="text-xl font-bold text-ink-900">{stockTransfersQuery.data.summary.total_transfers}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Items Moved")}</p>
              <p className="text-xl font-bold text-brand">{stockTransfersQuery.data.summary.total_items_moved}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{t("Total Quantity")}</p>
              <p className="text-xl font-bold text-ink-900">{stockTransfersQuery.data.summary.total_quantity}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Date")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("From Warehouse")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("To Warehouse")}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Items")}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Total Qty")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Created By")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Notes")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stockTransfersQuery.data.items.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">{t("No stock transfers found.")}</td></tr>
                ) : stockTransfersQuery.data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-slate-500">{item.transfer_date}</td>
                    <td className="px-5 py-3 font-medium text-ink-900">{item.from_warehouse}</td>
                    <td className="px-5 py-3 font-medium text-ink-900">{item.to_warehouse}</td>
                    <td className="px-5 py-3 text-center text-slate-700">{item.item_count}</td>
                    <td className="px-5 py-3 text-center font-semibold text-brand">{item.total_quantity}</td>
                    <td className="px-5 py-3 text-slate-500">{item.created_by}</td>
                    <td className="px-5 py-3 text-slate-400 truncate max-w-xs">{item.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

