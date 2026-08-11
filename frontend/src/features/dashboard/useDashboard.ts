import { useQuery } from "@tanstack/react-query";

import * as dashboardApi from "@/features/dashboard/dashboard.api";

export const DASHBOARD_QUERY_KEY = ["dashboard"] as const;

const REFETCH_INTERVAL_MS = 60_000;
const STALE_TIME_MS = 30_000;

export function useDashboardSummary() {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, "summary"],
    queryFn: dashboardApi.getDashboardSummary,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
  });
}

export function useDashboardTrends() {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, "trends"],
    queryFn: dashboardApi.getDashboardTrends,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, "recent-activity"],
    queryFn: dashboardApi.getRecentActivity,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
  });
}
