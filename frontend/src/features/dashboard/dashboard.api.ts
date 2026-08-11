import { api } from "@/lib/axios";
import type { ApiSuccessResponse } from "@/types/api.types";
import type {
  DashboardSummary,
  DashboardTrends,
  RecentActivityItem,
} from "@/features/dashboard/dashboard.types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<ApiSuccessResponse<DashboardSummary>>("/dashboard/summary");
  return data.data;
}

export async function getDashboardTrends(): Promise<DashboardTrends> {
  const { data } = await api.get<ApiSuccessResponse<DashboardTrends>>("/dashboard/trends");
  return data.data;
}

export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  const { data } = await api.get<ApiSuccessResponse<RecentActivityItem[]>>(
    "/dashboard/recent-activity"
  );
  return data.data;
}
