import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useBranch } from "../context/BranchContext";
import * as api from "../api/coupons";

export function useCoupons(
  params: { page?: number; per_page?: number; search?: string; status?: string; customer_id?: number; branch_id?: number } = {}
) {
  const { currentBranchId } = useBranch();
  return useQuery({
    queryKey: ["coupons", { ...params, branchId: currentBranchId }],
    queryFn: () => api.listCoupons(params),
    placeholderData: (prev) => prev,
  });
}

export function useCoupon(id: number | undefined) {
  return useQuery({
    queryKey: ["coupons", id],
    queryFn: () => api.getCoupon(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon created successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Could not create coupon"),
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<api.CouponPayload> }) =>
      api.updateCoupon(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon updated successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Could not update coupon"),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon deleted");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Could not delete coupon"),
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: ({ code, customer_id, subtotal }: { code: string; customer_id: number; subtotal: number }) =>
      api.validateCoupon(code, customer_id, subtotal),
  });
}