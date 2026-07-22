import { apiClient } from "./client";
import type { Invoice, InvoiceItem, PaginatedResponse } from "../types";

export type QuotationStatus = "draft" | "sent" | "accepted" | "declined";

export interface QuotationPayload {
  customer_id: number;
  warehouse_id?: number | null;
  issue_date?: string;
  expiry_date?: string | null;
  discount_type: "flat" | "percent";
  discount_value: number;
  notes?: string | null;
  terms_conditions?: string | null;
  status: QuotationStatus;
  items: Omit<InvoiceItem, "id" | "line_subtotal" | "line_tax" | "line_total">[];
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  warehouse_id?: number | null;
  customer?: { id: number; name: string } | null;
  warehouse?: { id: number; name: string; location: string | null } | null;
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
  items?: InvoiceItem[];
  created_at: string;
}

export async function listQuotations(
  params: { page?: number; search?: string; status?: QuotationStatus } = {}
) {
  const { data } = await apiClient.get<PaginatedResponse<Quotation>>("/quotations", { params });
  return data;
}

export async function getQuotation(id: number) {
  const { data } = await apiClient.get<Quotation>(`/quotations/${id}`);
  return data;
}

export async function createQuotation(payload: QuotationPayload) {
  const { data } = await apiClient.post<Quotation>("/quotations", payload);
  return data;
}

export async function updateQuotation(id: number, payload: Partial<QuotationPayload>) {
  const { data } = await apiClient.put<Quotation>(`/quotations/${id}`, payload);
  return data;
}

export async function deleteQuotation(id: number) {
  await apiClient.delete(`/quotations/${id}`);
}

export async function convertQuotationToInvoice(id: number) {
  const { data } = await apiClient.post<Invoice>(`/quotations/${id}/convert-to-invoice`);
  return data;
}
