import { useState } from "react";
import {
  IndianRupee,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Users,
  Package,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useDashboardSummary } from "../hooks/useDashboard";
import type { DashboardPeriod } from "../api/dashboard";
import { StatCard } from "../components/dashboard/StatCard";
import { CountCard } from "../components/dashboard/CountCard";
import { PeriodFilter } from "../components/dashboard/PeriodFilter";
import { SalesBarChart } from "../components/dashboard/MonthlySalesChart";
import { RecentProductsTable } from "../components/dashboard/RecentProductsTable";
import { StockAlertTable } from "../components/dashboard/StockAlertTable";
import { TrendingDonutChart } from "../components/dashboard/TrendingDonutChart";
import { RecentInvoicesTable } from "../components/dashboard/RecentInvoicesTable";
import { CardSkeleton } from "../components/ui/Skeletons";
import { formatMoney } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import { useBranch } from "../context/BranchContext";   // ✅ Correct import path

// ── Section card wrapper ─────────────────────────────────────────────────────
function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { currentBranchId } = useBranch();       // 👈 Get current branch ID

  const [period, setPeriod] = useState<DashboardPeriod>("all");

  // 👇 Pass branch_id to the hook
  const { data, isLoading, isError } = useDashboardSummary(period, currentBranchId || undefined);

  if (isError) {
    return (
      <div className="rounded-xl border border-danger-light bg-danger-light/40 p-6 text-danger flex items-center gap-3">
        <AlertTriangle size={20} />
        <span>{t("Couldn't load dashboard data. Try refreshing the page.")}</span>
      </div>
    );
  }

  const stats = data?.stats;
  const counts = data?.counts;

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("Dashboard")}</h1>
          <p className="text-sm text-slate-500">{t("Overview of your business performance")}</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* ── Stat cards row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !stats ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={t("Purchase Due")}
              value={formatMoney(stats.purchase_due)}
              icon={ShoppingCart}
              tone="purple"
            />
            <StatCard
              label={t("Sales Due")}
              value={formatMoney(stats.sales_due)}
              icon={IndianRupee}
              tone="red"
            />
            <StatCard
              label={t("Sales")}
              value={formatMoney(stats.total_sales)}
              icon={TrendingUp}
              tone="green"
            />
            <StatCard
              label={t("Expense")}
              value={formatMoney(stats.expense)}
              icon={CreditCard}
              tone="navy"
            />
          </>
        )}
      </div>

      {/* ── Count cards row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading || !counts ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <CountCard
              label={t("Customers")}
              count={counts.customers}
              icon={Users}
              iconBg="bg-blue-100 text-blue-600"
              to={hasPermission("customers.view") ? "/customers" : undefined}
            />
            <CountCard
              label={t("Products")}
              count={counts.products}
              icon={Package}
              iconBg="bg-emerald-100 text-emerald-600"
              to={hasPermission("items.view") ? "/items" : undefined}
            />
            <CountCard
              label={t("Invoices")}
              count={counts.invoices}
              icon={FileText}
              iconBg="bg-amber-100 text-amber-600"
              to={hasPermission("invoices.view") ? "/invoices" : undefined}
            />
            <CountCard
              label={t("Paid Invoices")}
              count={counts.paid_invoices}
              icon={CheckCircle2}
              iconBg="bg-violet-100 text-violet-600"
              to={hasPermission("invoices.view") ? "/invoices" : undefined}
            />
          </>
        )}
      </div>

      {/* ── Bar chart + Recent products ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title={t("Purchase, Sales & Expense Bar Chart")} className="lg:col-span-2">
          <div className="p-4">
            {isLoading || !data ? (
              <div className="h-64 animate-pulse rounded bg-slate-100" />
            ) : (
              <SalesBarChart data={data.bar_chart} />
            )}
          </div>
        </Section>

        <Section title={t("Recent Products")}>
          <RecentProductsTable
            products={data?.recent_products ?? []}
            isLoading={isLoading}
          />
        </Section>
      </div>

      {/* ── Donut chart + Recent invoices ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Section title={t("Trending Items")} className="lg:col-span-2">
          <div className="p-4">
            <TrendingDonutChart
              data={data?.top_trending ?? []}
              isLoading={isLoading}
            />
          </div>
        </Section>

        <Section title={t("Recent Sales Invoices")} className="lg:col-span-3">
          <RecentInvoicesTable
            invoices={data?.recent_invoices ?? []}
            isLoading={isLoading}
          />
        </Section>
      </div>

      {/* ── Stock Alert ───────────────────────────────────────────────── */}
      <Section title={`${t("Stock Alert")} (≤ ${data?.low_stock_threshold ?? 5} ${t("units")})`}>
        <StockAlertTable
          items={data?.stock_alert ?? []}
          threshold={data?.low_stock_threshold ?? 5}
          isLoading={isLoading}
        />
      </Section>
    </div>
  );
}