// frontend/src/hooks/useBranches.ts

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";  // ✅ ADD useQueryClient, useMutation
import toast from "react-hot-toast";
import api from "../api/client";
import type { Branch, PaginatedResponse } from "../types";

export interface UseBranchesParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export function useBranches(
  params: UseBranchesParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Branch>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["branches", params],
    queryFn: () =>
      api.get<PaginatedResponse<Branch>>("/branches", { params }).then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    ...options,
  });
}

// ─── Single Branch ──────────────────────────────────────────────────────────
export function useBranch(
  id: number | undefined,
  options?: Omit<UseQueryOptions<Branch>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["branches", id],
    queryFn: () => api.get<Branch>(`/branches/${id}`).then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
    ...options,
  });
}

// ─── Create Branch Mutation ────────────────────────────────────────────────
export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Branch>) =>
      api.post<Branch>("/branches", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Couldn't create branch."),
  });
}

// ─── Update Branch Mutation ────────────────────────────────────────────────
export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Branch> }) =>
      api.put<Branch>(`/branches/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

// ─── Delete Branch Mutation ────────────────────────────────────────────────
export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete(`/branches/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}