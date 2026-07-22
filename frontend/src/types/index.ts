// frontend/src/types/index.ts

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
  // ✅ ADD THIS - Branch assignment
  branch_id?: number | null;
  branch?: Branch | null;
  // Only present on the /auth/me response, not on list/detail responses
  permissions?: string[];
  // ✅ ADD THIS - Branches from login response
  branches?: Branch[];
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
  item_id?: number | null;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_subtotal?: number;
  line_tax?: number;
  line_cgst?: number;
  line_sgst?: number;
  line_igst?: number;
  line_total?: number;
  branch_id?: number | null;
  branch?: Branch | null;
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
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
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
  branches?: Branch[];  // ✅ ADD THIS
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
  is_default?: boolean;  // ✅ ADD THIS - For login response
}

// ─── Purchase Types ──────────────────────────────────────────────────────────

export type PurchaseStatus = "draft" | "pending" | "received" | "cancelled" | "returned";
export type PurchasePaymentStatus = "pending" | "paid" | "partial";
export type PurchasePaymentType = "cash" | "bank" | "cheque" | "online";

export interface PurchaseItem {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_subtotal?: number;
  line_tax?: number;
  line_total?: number;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface Purchase {
  id: number;
  purchase_number: string;
  supplier_id: number;
  supplier?: Supplier | null;
  issue_date: string | null;
  due_date: string | null;
  discount_type: "flat" | "percent";
  discount_value: number;
  notes: string | null;
  status: PurchaseStatus;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  items?: PurchaseItem[];
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface PurchasePayment {
  id: number;
  purchase_id: number;
  amount: number;
  payment_date: string;
  payment_type: PurchasePaymentType;
  reference: string | null;
  notes: string | null;
  status: PurchasePaymentStatus;
  created_at: string;
}

export interface PurchaseReturn {
  id: number;
  return_number: string;
  purchase_id: number;
  purchase?: Purchase | null;
  supplier_id: number;
  supplier?: Supplier | null;
  issue_date: string;
  notes: string | null;
  status: PurchaseStatus;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  items?: PurchaseReturnItem[];
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface PurchaseReturnItem {
  id?: number;
  purchase_item_id?: number | null;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_subtotal?: number;
  line_tax?: number;
  line_total?: number;
  branch_id?: number | null;
  branch?: Branch | null;
}

// ─── Stock Types ─────────────────────────────────────────────────────────────

export interface StockAdjustment {
  id: number;
  adjustment_number: string;
  product_id: number;
  product?: Product | null;
  adjustment_type: "add" | "subtract";
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  notes: string | null;
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  product_id: number;
  product?: Product | null;
  from_branch_id: number;
  from_branch?: Branch | null;
  to_branch_id: number;
  to_branch?: Branch | null;
  quantity: number;
  status: "pending" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  branch_id?: number | null;
  branch?: Branch | null;
}

// ─── Expense Types ──────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: number;
  expense_date: string;
  category_id: number;
  category?: ExpenseCategory | null;
  reference_no: string | null;
  expense_for: string | null;
  amount: number;
  account_id: number | null;
  account?: Account | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

// ─── Account Types ──────────────────────────────────────────────────────────

export interface Account {
  id: number;
  account_name: string;
  account_number: string | null;
  bank_name: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface AccountTransaction {
  id: number;
  account_id: number;
  account?: Account | null;
  transaction_type: "credit" | "debit";
  amount: number;
  reference: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface MoneyTransfer {
  id: number;
  transfer_number: string;
  from_account_id: number;
  from_account?: Account | null;
  to_account_id: number;
  to_account?: Account | null;
  amount: number;
  transfer_date: string;
  reference: string | null;
  notes: string | null;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface Deposit {
  id: number;
  deposit_number: string;
  account_id: number;
  account?: Account | null;
  amount: number;
  deposit_date: string;
  reference: string | null;
  notes: string | null;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface CashTransaction {
  id: number;
  transaction_number: string;
  transaction_type: "cash_in" | "cash_out";
  amount: number;
  description: string | null;
  reference: string | null;
  transaction_date: string;
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

// ─── Quotation Types ─────────────────────────────────────────────────────────

export type QuotationStatus = "draft" | "sent" | "accepted" | "declined";

export interface QuotationItem {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_subtotal?: number;
  line_tax?: number;
  line_total?: number;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  customer?: Customer | null;
  issue_date: string | null;
  expiry_date: string | null;
  discount_type: "flat" | "percent";
  discount_value: number;
  notes: string | null;
  terms_conditions?: string | null;
  status: QuotationStatus;
  converted_invoice_id?: number | null;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  items?: QuotationItem[];
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

// ─── Item Types ─────────────────────────────────────────────────────────────

export interface Item {
  id: number;
  item_code: string;
  item_name: string;
  description: string | null;
  unit_price: number;
  purchase_price: number;
  tax_id: number | null;
  tax?: Tax | null;
  opening_stock: number;
  alert_quantity: number;
  category_id: number | null;
  category?: Category | null;
  brand_id: number | null;
  brand?: Brand | null;
  unit_id: number | null;
  unit?: Unit | null;
  is_active: boolean;
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Brand {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ItemGroup {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Tax {
  id: number;
  name: string;
  tax_value: number;
  tax_type: "percentage" | "fixed";
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Variant {
  id: number;
  name: string;
  sku: string;
  item_id: number;
  item?: Item | null;
  attributes: Record<string, string>;
  unit_price: number;
  purchase_price: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  branch_id?: number | null;
  branch?: Branch | null;
}