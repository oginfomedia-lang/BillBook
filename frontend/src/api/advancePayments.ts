import apiClient from "./client";
import type { AdvancePayment, AdvancePaymentStatus, PaginatedResponse } from "../types";

export interface AdvancePaymentPayload {
  customer_id: number;
  amount: number;
  payment_date?: string | null;
  payment_type: "cash" | "bank" | "cheque" | "online";
  reference?: string | null;
  notes?: string | null;
  status?: AdvancePaymentStatus;
  branch_id?: number | null;
}

export async function listAdvancePayments(params: {
  page?: number;
  per_page?: number;
  search?: string;
  customer_id?: number;
  branch_id?: number;
} = {}) {
  const { data } = await apiClient.get<PaginatedResponse<AdvancePayment>>("/advance-payments", { params });
  return data;
}

export async function getAdvancePayment(id: number) {
  const { data } = await apiClient.get<AdvancePayment>(`/advance-payments/${id}`);
  return data;
}

export async function createAdvancePayment(payload: AdvancePaymentPayload) {
  const { data } = await apiClient.post<AdvancePayment>("/advance-payments", payload);
  return data;
}

export async function updateAdvancePayment(id: number, payload: Partial<AdvancePaymentPayload>) {
  const { data } = await apiClient.put<AdvancePayment>(`/advance-payments/${id}`, payload);
  return data;
}

export async function deleteAdvancePayment(id: number) {
  await apiClient.delete(`/advance-payments/${id}`);
}