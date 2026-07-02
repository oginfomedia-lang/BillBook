import { apiClient } from "./client";
import type { Branch, PaginatedResponse } from "../types";

export interface BranchPayload {
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}

export async function listBranches(params: { page?: number; per_page?: number; search?: string } = {}) {
  const { data } = await apiClient.get<PaginatedResponse<Branch>>("/branches", { params });
  return data;
}

export async function getBranch(id: number) {
  const { data } = await apiClient.get<Branch>(`/branches/${id}`);
  return data;
}

export async function createBranch(payload: BranchPayload) {
  const { data } = await apiClient.post<Branch>("/branches", payload);
  return data;
}

export async function updateBranch(id: number, payload: Partial<BranchPayload>) {
  const { data } = await apiClient.put<Branch>(`/branches/${id}`, payload);
  return data;
}

export async function deleteBranch(id: number) {
  await apiClient.delete(`/branches/${id}`);
}