import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as productsApi from "../api/products";

export function useProducts(params: { page?: number; per_page?: number; search?: string; branch_id?: number } = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productsApi.listProducts(params),
    placeholderData: (prev) => prev,
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

//  Update import mutation to accept file and branch_id
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