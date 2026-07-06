import { apiClient } from "./client";
import type { Coupon, PaginatedResponse } from "../types";

export interface CouponPayload {
  code?: string;
  name: string;
  description?: string | null;
  occasion?: string | null;
  type: "percentage" | "fixed";
  value: number;
  expiry_date?: string | null;
  is_active?: boolean;
  max_uses?: number;
  customer_id?: number | null;
  branch_id?: number | null;   // 👈 Added
}

export async function listCoupons(
  params: { page?: number; per_page?: number; search?: string; status?: string; customer_id?: number; branch_id?: number } = {}
) {
  const { data } = await apiClient.get<PaginatedResponse<Coupon>>("/coupons", { params });
  return data;
}

export async function getCoupon(id: number) {
  const { data } = await apiClient.get<Coupon>(`/coupons/${id}`);
  return data;
}

export async function createCoupon(payload: CouponPayload) {
  const { data } = await apiClient.post<Coupon>("/coupons", payload);
  return data;
}

export async function updateCoupon(id: number, payload: Partial<CouponPayload>) {
  const { data } = await apiClient.put<Coupon>(`/coupons/${id}`, payload);
  return data;
}

export async function deleteCoupon(id: number) {
  await apiClient.delete(`/coupons/${id}`);
}

export async function validateCoupon(code: string, customer_id: number, subtotal: number) {
  const { data } = await apiClient.post<{
    valid: boolean;
    coupon: Coupon;
    discount: number;
    message: string;
  }>("/coupons/validate", { code, customer_id, subtotal });
  return data;
}