import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAdjustments,
  getAdjustment,
  createAdjustment,
  updateAdjustment,
  deleteAdjustment,
  listTransfers,
  getTransfer,
  createTransfer,
  updateTransfer,
  deleteTransfer,
} from "../api/stock";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const stockKeys = {
  all: ["stock"] as const,
  adjustments: () => [...stockKeys.all, "adjustments"] as const,
  adjustmentList: (params: any) => [...stockKeys.adjustments(), "list", params] as const,
  adjustmentDetail: (id: number) => [...stockKeys.adjustments(), "detail", id] as const,
  transfers: () => [...stockKeys.all, "transfers"] as const,
  transferList: (params: any) => [...stockKeys.transfers(), "list", params] as const,
  transferDetail: (id: number) => [...stockKeys.transfers(), "detail", id] as const,
};

// ─── Adjustment Hooks ─────────────────────────────────────────────────────────

export function useAdjustments(params: {
  page?: number;
  per_page?: number;
  search?: string;
  warehouse_id?: number;
} = {}) {
  return useQuery({
    queryKey: stockKeys.adjustmentList(params),
    queryFn: () => listAdjustments(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAdjustment(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: stockKeys.adjustmentDetail(id),
    queryFn: () => getAdjustment(id),
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.adjustments() });
    },
  });
}

export function useUpdateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateAdjustment>[1] }) =>
      updateAdjustment(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: stockKeys.adjustments() });
      queryClient.invalidateQueries({ queryKey: stockKeys.adjustmentDetail(id) });
    },
  });
}

export function useDeleteAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.adjustments() });
    },
  });
}

// ─── Transfer Hooks ───────────────────────────────────────────────────────────

export function useTransfers(params: {
  page?: number;
  per_page?: number;
  search?: string;
} = {}) {
  return useQuery({
    queryKey: stockKeys.transferList(params),
    queryFn: () => listTransfers(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useTransfer(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: stockKeys.transferDetail(id),
    queryFn: () => getTransfer(id),
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.transfers() });
    },
  });
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateTransfer>[1] }) =>
      updateTransfer(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: stockKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: stockKeys.transferDetail(id) });
    },
  });
}

export function useDeleteTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.transfers() });
    },
  });
}
