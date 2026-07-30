import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export function useStoreProfile() {
  return useQuery({
    queryKey: ["settings", "store"],
    queryFn: async () => {
      const { data } = await apiClient.get("/settings/store");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
