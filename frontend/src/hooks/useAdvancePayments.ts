import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useBranch } from "../context/BranchContext";
import * as api from "../api/advancePayments";

export function useAdvancePayments(
  params: { page?: number; per_page?: number; search?: string; customer_id?: number; branch_id?: number } = {}
) {
  const { currentBranchId } = useBranch();
  return useQuery({
    queryKey: ["advance-payments", { ...params, branchId: currentBranchId }],
    queryFn: () => api.listAdvancePayments(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateAdvancePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createAdvancePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advance-payments"] });
      toast.success("Advance payment added");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Could not create advance payment"),
  });
}

export function useUpdateAdvancePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<api.AdvancePaymentPayload> }) =>
      api.updateAdvancePayment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advance-payments"] });
      toast.success("Advance payment updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Could not update advance payment"),
  });
}

export function useDeleteAdvancePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAdvancePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advance-payments"] });
      toast.success("Advance payment deleted");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Could not delete advance payment"),
  });
}