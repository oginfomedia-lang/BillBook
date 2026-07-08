import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as api from "../api/branches";

export function useBranches(
  params: { page?: number; per_page?: number; search?: string } = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ["branches", params],
    queryFn: () => api.listBranches(params),
    placeholderData: (prev) => prev,
    enabled: options.enabled !== false,
  });
}

export function useBranch(id: number | undefined) {
  return useQuery({
    queryKey: ["branches", id],
    queryFn: () => api.getBranch(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch created successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Could not create branch"),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<api.BranchPayload> }) =>
      api.updateBranch(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch updated successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Could not update branch"),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch deleted");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Could not delete branch"),
  });
}