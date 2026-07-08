import apiClient, { tokenStorage } from "./client";
import type { AuthResponse, User } from "../types";

export interface SignupPayload {
  company_name: string;
  admin_name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/signup", payload);
  tokenStorage.setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
  tokenStorage.setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export function logout() {
  tokenStorage.clear();
}

export interface UpdateProfilePayload {
  name: string;
  email: string;
  avatar?: string | null;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await apiClient.put<User>("/auth/profile", payload);
  return data;
}

export interface ChangePasswordPayload {
  current_password?: string;
  new_password?: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>("/auth/password", payload);
  return data;
}
