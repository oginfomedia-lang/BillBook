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

// Update import function to accept branch_id
export async function importProducts(file: File, branch_id?: number) {
  const formData = new FormData();
  formData.append("file", file);
  const params = branch_id ? { branch_id } : {};
  const { data } = await apiClient.post("/products/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params,
  });
  return data;
}