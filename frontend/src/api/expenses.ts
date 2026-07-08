import { apiClient } from "./client";
import type { PaginatedResponse } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  created_at: string;
}

export interface Expense {
  id: number;
  expense_date: string;
  category_id: number;
  category_name: string | null;
  reference_no: string | null;
  expense_for: string | null;
  amount: number;
  account_id: number | null;
  account_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PaginatedExpenses {
  expenses: Expense[];
  total: number;
  total_amount: number;
  page: number;
  pages: number;
  per_page: number;
}

// ─── Expense Categories API ───────────────────────────────────────────────────

export const listExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const { data } = await apiClient.get<ExpenseCategory[]>("/expenses/categories");
  return data;
};

export const createExpenseCategory = async (payload: {
  name: string;
  description?: string;
  status?: "active" | "inactive";
}): Promise<ExpenseCategory> => {
  const { data } = await apiClient.post<ExpenseCategory>("/expenses/categories", payload);
  return data;
};

export const updateExpenseCategory = async (
  id: number,
  payload: Partial<Parameters<typeof createExpenseCategory>[0]>
): Promise<ExpenseCategory> => {
  const { data } = await apiClient.put<ExpenseCategory>(`/expenses/categories/${id}`, payload);
  return data;
};

export const deleteExpenseCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/expenses/categories/${id}`);
};

// ─── Expenses API ─────────────────────────────────────────────────────────────

export const listExpenses = async (
  params: { page?: number; per_page?: number; search?: string; category_id?: number } = {}
): Promise<PaginatedExpenses> => {
  const { data } = await apiClient.get<PaginatedExpenses>("/expenses", { params });
  return data;
};

export const getExpense = async (id: number): Promise<Expense> => {
  const { data } = await apiClient.get<Expense>(`/expenses/${id}`);
  return data;
};

export const createExpense = async (payload: {
  expense_date?: string;
  category_id: number;
  reference_no?: string;
  expense_for?: string;
  amount: number;
  account_id?: number | null;
  notes?: string;
}): Promise<Expense> => {
  const { data } = await apiClient.post<Expense>("/expenses", payload);
  return data;
};

export const updateExpense = async (
  id: number,
  payload: Partial<Parameters<typeof createExpense>[0]>
): Promise<Expense> => {
  const { data } = await apiClient.put<Expense>(`/expenses/${id}`, payload);
  return data;
};

export const deleteExpense = async (id: number): Promise<void> => {
  await apiClient.delete(`/expenses/${id}`);
};
