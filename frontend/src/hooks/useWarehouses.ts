import { useQuery } from "@tanstack/react-query";
import { useBranch } from "../context/BranchContext";
import * as warehousesApi from "../api/warehouses";

export function useWarehouses(
  params: { page?: number; per_page?: number; search?: string } = {}
) {
  const { currentBranchId } = useBranch();
  return useQuery({
    queryKey: ["warehouses", { ...params, branchId: currentBranchId }],
    queryFn: () => warehousesApi.listWarehouses(params),
    placeholderData: (prev) => prev,
  });
}

export function useWarehouse(id: number | undefined) {
  return useQuery({
    queryKey: ["warehouses", id],
    queryFn: () => warehousesApi.getWarehouse(id as number),
    enabled: id !== undefined,
  });
}
