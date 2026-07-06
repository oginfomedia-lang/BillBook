import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as customersApi from "../api/customers";

export function useCustomers(
  params: { page?: number; per_page?: number; search?: string; branch_id?: number } = {}
) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => customersApi.listCustomers(params),
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: number | undefined) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => customersApi.getCustomer(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added");
    },
    onError: () => toast.error("Couldn't add customer. Check the details and try again."),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: customersApi.CustomerPayload }) =>
      customersApi.updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated");
    },
    onError: () => toast.error("Couldn't save changes."),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer removed");
    },
    onError: () => toast.error("Couldn't remove customer."),
  });
}

export function useImportCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, branch_id }: { file: File; branch_id?: number }) =>
      customersApi.importCustomers(file, branch_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customers imported successfully");
    },
    onError: () => toast.error("Couldn't import customers."),
  });
}