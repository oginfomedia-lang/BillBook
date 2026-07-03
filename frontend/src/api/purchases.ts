// src/api/purchases.ts
import { apiClient } from "./client";
import type { PaginatedResponse, Supplier } from "../types";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type PurchaseStatus = "draft" | "ordered" | "received" | "partial" | "cancelled";
export type PurchasePaymentStatus = "pending" | "partial" | "paid";
export type PurchasePaymentType = "cash" | "bank" | "upi" | "cheque" | "card" | "other";
export type PurchaseReturnStatus = "pending" | "approved" | "completed" | "cancelled";

export interface PurchaseItem {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  purchase_price: number;
  discount: number;
  tax_amount: number;
  unit_cost?: number;
  line_total?: number;
}

export interface PurchasePayment {
  id: number;
  purchase_id: number;
  amount: number;
  payment_type: PurchasePaymentType;
  account: string | null;
  payment_note: string | null;
  payment_date: string | null;
  created_at: string;
}

export interface Purchase {
  id: number;
  purchase_code: string;
  supplier_id: number;
  supplier?: Supplier | null;
  warehouse_id?: number | null;
  warehouse?: { id: number; name: string; location: string | null } | null;
  purchase_date: string | null;
  reference_no: string | null;
  other_charges: number;
  other_charges_type: string | null;
  discount_on_all: number;
  discount_type: "flat" | "percent";
  note: string | null;
  status: PurchaseStatus;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  other_charges_total: number;
  round_off: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  payment_status: PurchasePaymentStatus;
  created_by?: number | null;
  creator_name?: string | null;
  items?: PurchaseItem[];
  payments?: PurchasePayment[];
  created_at: string;
}

export interface PurchaseStats {
  total_invoices: number;
  total_amount: number;
  total_paid: number;
  total_due: number;
}

export interface PurchasePayload {
  supplier_id: number;
  warehouse_id?: number | null;
  purchase_date?: string;
  reference_no?: string | null;
  other_charges?: number;
  other_charges_type?: string | null;
  discount_on_all?: number;
  discount_type?: "flat" | "percent";
  note?: string | null;
  status?: PurchaseStatus;
  items: Omit<PurchaseItem, "id" | "unit_cost" | "line_total">[];
  payment?: {
    amount: number;
    payment_type: PurchasePaymentType;
    account?: string | null;
    payment_note?: string | null;
    payment_date?: string | null;
  } | null;
}

export interface PurchaseReturnItem {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  purchase_price: number;
  tax_amount: number;
  line_total?: number;
}

export interface PurchaseReturn {
  id: number;
  return_code: string;
  purchase_id: number;
  purchase_code?: string | null;
  supplier_id?: number | null;
  supplier?: Supplier | null;
  warehouse_id?: number | null;
  warehouse?: { id: number; name: string; location: string | null } | null;
  return_date: string | null;
  reference_no: string | null;
  note: string | null;
  status: PurchaseReturnStatus;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  payment_status: PurchasePaymentStatus;
  creator_name?: string | null;
  items?: PurchaseReturnItem[];
  created_at: string;
}

export interface PurchaseReturnPayload {
  purchase_id: number;
  supplier_id?: number | null;
  warehouse_id?: number | null;
  return_date?: string;
  reference_no?: string | null;
  note?: string | null;
  status?: PurchaseReturnStatus;
  items: Omit<PurchaseReturnItem, "id" | "line_total">[];
}

// -------------------------------------------------------------------
// Purchase API
// -------------------------------------------------------------------

export async function getPurchaseStats(params: { warehouse_id?: number } = {}): Promise<PurchaseStats> {
  const { data } = await apiClient.get<PurchaseStats>("/purchases/stats", { params });
  return data;
}

export async function listPurchases(
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    warehouse_id?: number;
    status?: PurchaseStatus;
    payment_status?: PurchasePaymentStatus;
  } = {}
) {
  const { data } = await apiClient.get<PaginatedResponse<Purchase>>("/purchases", { params });
  return data;
}

export async function getPurchase(id: number): Promise<Purchase> {
  const { data } = await apiClient.get<Purchase>(`/purchases/${id}`);
  return data;
}

export async function createPurchase(payload: PurchasePayload): Promise<Purchase> {
  const { data } = await apiClient.post<Purchase>("/purchases", payload);
  return data;
}

export async function updatePurchase(id: number, payload: Partial<PurchasePayload>): Promise<Purchase> {
  const { data } = await apiClient.put<Purchase>(`/purchases/${id}`, payload);
  return data;
}

export async function deletePurchase(id: number): Promise<void> {
  await apiClient.delete(`/purchases/${id}`);
}

export async function addPurchasePayment(
  purchaseId: number,
  payload: {
    amount: number;
    payment_type: PurchasePaymentType;
    account?: string | null;
    payment_note?: string | null;
    payment_date?: string | null;
  }
): Promise<Purchase> {
  const { data } = await apiClient.post<Purchase>(`/purchases/${purchaseId}/payments`, payload);
  return data;
}

export async function deletePurchasePayment(purchaseId: number, paymentId: number): Promise<void> {
  await apiClient.delete(`/purchases/${purchaseId}/payments/${paymentId}`);
}

// -------------------------------------------------------------------
// Purchase Returns API
// -------------------------------------------------------------------

export async function getPurchaseReturnStats(params: { warehouse_id?: number } = {}): Promise<PurchaseStats> {
  const { data } = await apiClient.get<PurchaseStats>("/purchase-returns/stats", { params });
  return data;
}

export async function listPurchaseReturns(
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    warehouse_id?: number;
    status?: PurchaseReturnStatus;
  } = {}
) {
  const { data } = await apiClient.get<PaginatedResponse<PurchaseReturn>>("/purchase-returns", { params });
  return data;
}

export async function getPurchaseReturn(id: number): Promise<PurchaseReturn> {
  const { data } = await apiClient.get<PurchaseReturn>(`/purchase-returns/${id}`);
  return data;
}

export async function createPurchaseReturn(payload: PurchaseReturnPayload): Promise<PurchaseReturn> {
  const { data } = await apiClient.post<PurchaseReturn>("/purchase-returns", payload);
  return data;
}

export async function deletePurchaseReturn(id: number): Promise<void> {
  await apiClient.delete(`/purchase-returns/${id}`);
}
