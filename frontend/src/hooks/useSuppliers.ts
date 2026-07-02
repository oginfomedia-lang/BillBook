import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as suppliersApi from "../api/suppliers";

export function useSuppliers(params: { page?: number; per_page?: number; search?: string; branch_id?: number } = {}) {
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => suppliersApi.listSuppliers(params),
    placeholderData: (prev) => prev,
  });
}

function extractAxiosErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }
  const typed = error as { response?: { data?: unknown }; message?: string };
  if (typed.response?.data && typeof typed.response.data === "object") {
    const data = typed.response.data as Record<string, unknown>;
    if (typeof data.error === "string") {
      return data.error;
    }
    if (data.details) {
      try {
        return JSON.stringify(data.details);
      } catch {
        return fallback;
      }
    }
  }
  return typed.message ?? fallback;
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: suppliersApi.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier added");
    },
    onError: (error: unknown) => {
      toast.error(extractAxiosErrorMessage(error, "Couldn't add supplier."));
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: suppliersApi.SupplierPayload }) =>
      suppliersApi.updateSupplier(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier updated");
    },
    onError: (error: unknown) => {
      toast.error(extractAxiosErrorMessage(error, "Couldn't save changes."));
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: suppliersApi.deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier removed");
    },
    onError: () => toast.error("Couldn't remove supplier."),
  });
}

export function useImportSuppliers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: suppliersApi.importSuppliers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Suppliers imported successfully.");
    },
    onError: () => toast.error("Couldn’t import suppliers. Check the file and try again."),
  });
}
