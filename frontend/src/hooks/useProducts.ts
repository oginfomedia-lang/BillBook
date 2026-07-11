import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useBranch } from "../context/BranchContext";
import * as productsApi from "../api/products";

export function useProducts(params: { page?: number; per_page?: number; search?: string; branch_id?: number } = {}) {
  const { currentBranchId } = useBranch();

  return useQuery({
    queryKey: ["products", { ...params, branchId: currentBranchId }],
    queryFn: () => {
      // ✅ Pass branch_id from context to API
      const apiParams = {
        ...params,
        branch_id: params.branch_id || currentBranchId || undefined,
      };
      return productsApi.listProducts(apiParams);
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product added");
    },
    onError: () => toast.error("Couldn't add product."),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: productsApi.ProductPayload }) =>
      productsApi.updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated");
    },
    onError: () => toast.error("Couldn't save changes."),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product removed");
    },
    onError: () => toast.error("Couldn't remove product."),
  });
}

export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, branch_id }: { file: File; branch_id?: number }) =>
      productsApi.importProducts(file, branch_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Products imported successfully");
    },
    onError: () => toast.error("Couldn't import products."),
  });
}