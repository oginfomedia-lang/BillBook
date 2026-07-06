import { apiClient } from "./client";
import type { Invoice, InvoiceItem, InvoiceStatus, PaginatedResponse } from "../types";

export interface InvoicePayload {
  customer_id: number;
  issue_date?: string;
  due_date?: string | null;
  discount_type: "flat" | "percent";
  discount_value: number;
  notes?: string | null;
  status: InvoiceStatus;
  items: Omit<InvoiceItem, "id" | "line_subtotal" | "line_tax" | "line_total">[];
  coupon_code?: string | null;
  coupon_discount?: number;
  branch_id?: number | null;   // 👈 Added
}

export async function listInvoices(
  params: { page?: number; search?: string; status?: InvoiceStatus; branch_id?: number } = {}
) {
  const { data } = await apiClient.get<PaginatedResponse<Invoice>>("/invoices", { params });
  return data;
}

export async function getInvoice(id: number) {
  const { data } = await apiClient.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function createInvoice(payload: InvoicePayload) {
  const { data } = await apiClient.post<Invoice>("/invoices", payload);
  return data;
}

export async function updateInvoice(id: number, payload: Partial<InvoicePayload>) {
  const { data } = await apiClient.put<Invoice>(`/invoices/${id}`, payload);
  return data;
}

export async function deleteInvoice(id: number) {
  await apiClient.delete(`/invoices/${id}`);
}

export async function recordPayment(id: number, amount: number) {
  const { data } = await apiClient.post<Invoice>(`/invoices/${id}/record-payment`, { amount });
  return data;
}