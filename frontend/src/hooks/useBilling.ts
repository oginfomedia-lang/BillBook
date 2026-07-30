import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as billingApi from "../api/billing";

export function usePlans() {
    return useQuery({
        queryKey: ["billing", "plans"],
        queryFn: billingApi.listPlans,
    });
}

export function useLicense() {
    return useQuery({
        queryKey: ["billing", "license"],
        queryFn: billingApi.getLicense,
    });
}
export function useCreateCheckoutOrder() {
  return useMutation({
    mutationFn: billingApi.createCheckoutOrder,
    onError: (err: any) => toast.error(err?.response?.data?.error || "Couldn't start checkout."),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingApi.verifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Plan activated!");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Payment verification failed."),
  });
}

export function useAdminTenantLicenses() {
  return useQuery({
    queryKey: ["billing", "admin", "tenants"],
    queryFn: billingApi.adminListTenantLicenses,
  });
}

export function useAdminAssignPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingApi.adminAssignPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "admin", "tenants"] });
      toast.success("Plan assigned");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Couldn't assign plan."),
  });
}