// frontend/src/api/auth.ts

import { apiClient, tokenStorage } from "./client";
import type { User, Branch } from "../types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  company_name: string;
  admin_name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  branches: Branch[];
  access_token: string;
  refresh_token: string;
}

export interface UpdateProfilePayload {
  name: string;
  email: string;
  avatar?: string | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
  // ✅ Store tokens
  if (data.access_token) {
    tokenStorage.setTokens(data.access_token, data.refresh_token);
  }
  return data;
}

export async function signup(payload: SignupPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/signup", payload);
  if (data.access_token) {
    tokenStorage.setTokens(data.access_token, data.refresh_token);
  }
  return data;
}

export async function fetchCurrentUser(): Promise<User & { branches?: Branch[] }> {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await apiClient.put<User>("/auth/profile", payload);
  return data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const { data } = await apiClient.put("/auth/password", payload);
  return data;
}

export function logout(): void {
  tokenStorage.clear();
  localStorage.removeItem("billbook_branch_id");
}