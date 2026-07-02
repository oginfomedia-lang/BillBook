import { apiClient } from "./client";
import type { PaginatedResponse, Supplier } from "../types";

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
  branch_id?: number | null;
}

function cleanSupplierPayload<T extends SupplierPayload | Partial<SupplierPayload>>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return [key, trimmed === "" ? null : trimmed];
      }
      return [key, value];
    })
  ) as T;
}

export async function listSuppliers(params: { page?: number; per_page?: number; search?: string; branch_id?: number } = {}) {
  const { data } = await apiClient.get<PaginatedResponse<Supplier>>("/suppliers", { params });
  return data;
}

export async function getSupplier(id: number) {
  const { data } = await apiClient.get<Supplier>(`/suppliers/${id}`);
  return data;
}

export async function createSupplier(payload: SupplierPayload) {
  const cleaned = cleanSupplierPayload(payload);
  const { data } = await apiClient.post<Supplier>("/suppliers", cleaned);
  return data;
}

export async function updateSupplier(id: number, payload: Partial<SupplierPayload>) {
  const cleaned = cleanSupplierPayload(payload);
  const { data } = await apiClient.put<Supplier>(`/suppliers/${id}`, cleaned);
  return data;
}

export async function deleteSupplier(id: number) {
  await apiClient.delete(`/suppliers/${id}`);
}

export async function importSuppliers(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<{ imported: number }>("/suppliers/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
