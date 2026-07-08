import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../api/expenses";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const expenseKeys = {
  all: ["expenses"] as const,
  categories: () => [...expenseKeys.all, "categories"] as const,
  expensesList: (params: any) => [...expenseKeys.all, "list", params] as const,
  expenseDetail: (id: number) => [...expenseKeys.all, "detail", id] as const,
};

// ─── Category Hooks ───────────────────────────────────────────────────────────

export function useExpenseCategories() {
  return useQuery({
    queryKey: expenseKeys.categories(),
    queryFn: listExpenseCategories,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createExpenseCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.categories() });
    },
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateExpenseCategory>[1] }) =>
      updateExpenseCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.categories() });
    },
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteExpenseCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.categories() });
    },
  });
}

// ─── Expense Hooks ────────────────────────────────────────────────────────────

export function useExpenses(params: {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
} = {}) {
  return useQuery({
    queryKey: expenseKeys.expensesList(params),
    queryFn: () => listExpenses(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useExpense(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: expenseKeys.expenseDetail(id),
    queryFn: () => getExpense(id),
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateExpense>[1] }) =>
      updateExpense(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.expenseDetail(id) });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}
