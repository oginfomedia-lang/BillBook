import { apiClient } from "./client";
import type { Supplier, PaginatedResponse } from "../types";

export interface SupplierPayload {
  name: string;
  mobile?: string | null;
  email?: string | null;
  phone?: string | null;
  gst_number?: string | null;
  tax_number?: string | null;
  opening_balance?: number;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  postcode?: string | null;
  address?: string | null;
  branch_id?: number | null;   // 👈 Added
}

export async function listSuppliers(
  params: { page?: number; per_page?: number; search?: string; branch_id?: number } = {}
) {
  const { data } = await apiClient.get<PaginatedResponse<Supplier>>("/suppliers", { params });
  return data;
}

export async function getSupplier(id: number) {
  const { data } = await apiClient.get<Supplier>(`/suppliers/${id}`);
  return data;
}

export async function createSupplier(payload: SupplierPayload) {
  const { data } = await apiClient.post<Supplier>("/suppliers", payload);
  return data;
}

export async function updateSupplier(id: number, payload: Partial<SupplierPayload>) {
  const { data } = await apiClient.put<Supplier>(`/suppliers/${id}`, payload);
  return data;
}

export async function deleteSupplier(id: number) {
  await apiClient.delete(`/suppliers/${id}`);
}

export async function importSuppliers(file: File, branch_id?: number) {
  const formData = new FormData();
  formData.append("file", file);
  const params = branch_id ? { branch_id } : {};
  const { data } = await apiClient.post("/suppliers/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params,
  });
  return data;
}