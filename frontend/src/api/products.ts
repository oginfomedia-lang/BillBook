import { apiClient } from "./client";
import type { Product, PaginatedResponse } from "../types";

export interface ProductPayload {
  name: string;
  sku?: string | null;
  description?: string | null;
  unit_price: number;
  tax_rate?: number;
  stock_quantity?: number;
  unit?: string;
  branch_id?: number | null;
}

export async function listProducts(params: { page?: number; per_page?: number; search?: string; branch_id?: number } = {}) {
  const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", { params });
  return data;
}

export async function getProduct(id: number) {
  const { data } = await apiClient.get<Product>(`/products/${id}`);
  return data;
}

export async function createProduct(payload: ProductPayload) {
  const { data } = await apiClient.post<Product>("/products", payload);
  return data;
}

export async function updateProduct(id: number, payload: Partial<ProductPayload>) {
  const { data } = await apiClient.put<Product>(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id: number) {
  await apiClient.delete(`/products/${id}`);
}

export async function importProducts(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<{ imported: number }>("/products/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
