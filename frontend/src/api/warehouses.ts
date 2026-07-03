import { apiClient } from "./client";
import type { PaginatedResponse } from "../types";

export interface Warehouse {
  id: number;
  name: string;
  location: string | null;
}

export async function listWarehouses(
  params: { page?: number; per_page?: number; search?: string } = {}
) {
  const { data } = await apiClient.get<PaginatedResponse<Warehouse>>("/warehouses", {
    params,
  });
  return data;
}

export async function getWarehouse(id: number) {
  const { data } = await apiClient.get<Warehouse>(`/warehouses/${id}`);
  return data;
}
