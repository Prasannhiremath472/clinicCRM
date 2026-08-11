import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import * as reportsApi from "@/features/reports/reports.api";
import type { ReportFiltersParams } from "@/features/reports/reports.types";
import type { ApiErrorResponse } from "@/types/api.types";

export const REPORTS_QUERY_KEY = ["reports"] as const;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.message ?? fallback;
  }
  return fallback;
}

export function useAppointmentReport(params: ReportFiltersParams) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "appointments", params],
    queryFn: () => reportsApi.getAppointmentReport(params),
    enabled: false,
  });
}

export function useRevenueReport(params: ReportFiltersParams) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "revenue", params],
    queryFn: () => reportsApi.getRevenueReport(params),
    enabled: false,
  });
}

export function usePatientReport(params: ReportFiltersParams) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "patients", params],
    queryFn: () => reportsApi.getPatientReport(params),
    enabled: false,
  });
}

export function useDoctorPerformanceReport(params: ReportFiltersParams) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "doctor-performance", params],
    queryFn: () => reportsApi.getDoctorPerformanceReport(params),
    enabled: false,
  });
}

export function useFollowUpReport(params: ReportFiltersParams) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "follow-ups", params],
    queryFn: () => reportsApi.getFollowUpReport(params),
    enabled: false,
  });
}

function useDownloadMutation(
  downloadFn: (params: ReportFiltersParams, format: "pdf" | "excel") => Promise<void>
) {
  return useMutation({
    mutationFn: ({ params, format }: { params: ReportFiltersParams; format: "pdf" | "excel" }) =>
      downloadFn(params, format),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not download report."));
    },
  });
}

export function useDownloadAppointmentReport() {
  return useDownloadMutation(reportsApi.downloadAppointmentReport);
}

export function useDownloadRevenueReport() {
  return useDownloadMutation(reportsApi.downloadRevenueReport);
}

export function useDownloadPatientReport() {
  return useDownloadMutation(reportsApi.downloadPatientReport);
}

export function useDownloadDoctorPerformanceReport() {
  return useDownloadMutation(reportsApi.downloadDoctorPerformanceReport);
}

export function useDownloadFollowUpReport() {
  return useDownloadMutation(reportsApi.downloadFollowUpReport);
}
