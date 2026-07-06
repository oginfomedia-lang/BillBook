import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary, type DashboardPeriod } from "../api/dashboard";

export function useDashboardSummary(period: DashboardPeriod = "all", branch_id?: number) {
  return useQuery({
    queryKey: ["dashboard", "summary", period, branch_id],
    queryFn: () => fetchDashboardSummary(period, branch_id),
    staleTime: 30_000,
  });
}