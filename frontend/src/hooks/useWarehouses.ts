import { useQuery } from "@tanstack/react-query";
import * as warehousesApi from "../api/warehouses";

export function useWarehouses(
  params: { page?: number; per_page?: number; search?: string } = {}
) {
  return useQuery({
    queryKey: ["warehouses", params],
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
