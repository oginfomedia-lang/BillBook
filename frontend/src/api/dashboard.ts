import { apiClient } from "./client";
import type { DashboardSummary } from "../types";

export type DashboardPeriod = "today" | "weekly" | "monthly" | "yearly" | "all";

export async function fetchDashboardSummary(
  period: DashboardPeriod = "all",
  branch_id?: number   // 👈 new
) {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary", {
    params: { period, branch_id },
  });
  return data;
}