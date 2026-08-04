import { apiClient } from "./client";
import type { User, PaginatedResponse } from "../types";

export interface UserCreatePayload {
  name: string;
  email: string;
  password: string;
  role_id: number;
  branch_id?: number | null;
}

export interface UserUpdatePayload {
  name?: string;
  role_id?: number | null;
  is_active?: boolean;
  branch_id?: number | null;
}

export async function listUsers(params: { page?: number; search?: string } = {}) {
  const { data } = await apiClient.get<PaginatedResponse<User>>("/users", { params });
  return data;
}

export async function getUser(id: number) {
  const { data } = await apiClient.get<User>(`/users/${id}`);
  return data;
}

export async function createUser(payload: UserCreatePayload) {
  const { data } = await apiClient.post<User>("/users", payload);
  return data;
}

export async function updateUser(id: number, payload: UserUpdatePayload) {
  const { data } = await apiClient.put<User>(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: number) {
  await apiClient.delete(`/users/${id}`);
}
