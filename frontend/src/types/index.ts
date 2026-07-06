export interface Tenant {
  id: number;
  company_name: string;
  slug: string;
  billing_email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  default_currency: string;
  plan: string;
  is_active: boolean;
}

export interface User {
  id: number;
  tenant_id: number | null;
  name: string;
  email: string;
  role_id: number | null;
  role_name: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  created_at?: string;
  avatar?: string | null;
  // Only present on the /auth/me response, not on list/detail responses
  permissions?: string[];
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  is_system: boolean;
  user_count: number;
}

export interface PermissionCatalog {
  catalog: Record<string, string[]>; // e.g. { invoices: ["view","create","edit","delete","record_payment"] }
  all_keys: string[]; // e.g. ["invoices.view", "invoices.create", ...]
}

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  gstin: string | null;
  balance: number;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface Supplier {
  id: number;
  name: string;
  mobile: string | null;
  email: string | null;
  phone: string | null;
  gst_number: string | null;
  tax_number: string | null;
  opening_balance: number;
  country: string | null;
  state: string | null;
  city: string | null;
  postcode: string | null;
  address: string | null;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface Warehouse {
  id: number;
  name: string;
  location: string | null;
}

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  unit_price: number;
  tax_rate: number;
  stock_quantity: number;
  unit: string;
  is_active: boolean;
  branch_id?: number | null;
  branch?: Branch | null;
}

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

export interface InvoiceItem {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_subtotal?: number;
  line_tax?: number;
  line_total?: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer?: Customer | null;
  issue_date: string | null;
  due_date: string | null;
  discount_type: "flat" | "percent";
  discount_value: number;
  notes: string | null;
  status: InvoiceStatus;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  items?: InvoiceItem[];
  created_at: string;
  coupon_code?: string | null;
  coupon_discount?: number;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface DashboardStats {
  purchase_due: number;
  sales_due: number;
  total_sales: number;
  expense: number;
}

export interface DashboardCounts {
  customers: number;
  products: number;
  invoices: number;
  paid_invoices: number;
}

export interface BarChartPoint {
  label: string;
  sales: number;
  purchase: number;
  expense: number;
}

export interface RecentProduct {
  id: number;
  name: string;
  unit_price: number;
}

export interface StockAlertItem {
  id: number;
  name: string;
  sku: string;
  stock_quantity: number;
  unit: string;
}

export interface TrendingItem {
  name: string;
  qty: number;
}

export interface DashboardSummary {
  // New rich fields
  stats: DashboardStats;
  counts: DashboardCounts;
  bar_chart: BarChartPoint[];
  recent_products: RecentProduct[];
  stock_alert: StockAlertItem[];
  low_stock_threshold: number;
  top_trending: TrendingItem[];
  recent_invoices: Invoice[];
  // Legacy (kept for backward compat)
  total_revenue: number;
  pending_invoices: { count: number; amount: number };
  paid_invoices: { count: number };
  monthly_sales: { month: string; total: number }[];
  recent_transactions: Invoice[];
}

export interface AuthResponse {
  user: User;
  tenant?: Tenant;
  access_token: string;
  refresh_token: string;
}

export type PaymentType = "cash" | "bank" | "cheque" | "online";
export type AdvancePaymentStatus = "pending" | "applied" | "cancelled";

export interface AdvancePayment {
  id: number;
  advance_number: string;
  customer_id: number;
  customer?: Customer | null;
  amount: number;
  payment_date: string | null;
  payment_type: PaymentType;
  reference: string | null;
  notes: string | null;
  status: AdvancePaymentStatus;
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export type CouponType = "percentage" | "fixed";
export type CouponStatus = "active" | "inactive" | "expired";

export interface Coupon {
  id: number;
  code: string;
  name: string;
  description: string | null;
  occasion: string | null;
  type: CouponType;
  value: number;
  expiry_date: string | null;
  is_active: boolean;
  max_uses: number;
  used_count: number;
  customer_id: number | null;
  customer?: Customer | null;
  status: CouponStatus;
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}
