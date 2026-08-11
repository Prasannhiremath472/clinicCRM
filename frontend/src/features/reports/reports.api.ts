import { api } from "@/lib/axios";
import type { ApiSuccessResponse } from "@/types/api.types";
import type {
  AppointmentReportRow,
  DoctorPerformanceReportRow,
  ExportFormat,
  FollowUpReportRow,
  PatientReportResult,
  ReportFiltersParams,
  RevenueReportResult,
} from "@/features/reports/reports.types";

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function extensionFor(format: ExportFormat): string {
  return format === "excel" ? "xlsx" : "pdf";
}

async function downloadReportExport(
  path: string,
  params: ReportFiltersParams,
  format: "pdf" | "excel",
  fileBaseName: string
): Promise<void> {
  const { data } = await api.get(path, {
    params: { ...params, format },
    responseType: "blob",
  });
  triggerBlobDownload(data as Blob, `${fileBaseName}.${extensionFor(format)}`);
}

export async function getAppointmentReport(params: ReportFiltersParams): Promise<AppointmentReportRow[]> {
  const { data } = await api.get<ApiSuccessResponse<{ rows: AppointmentReportRow[] }>>("/reports/appointments", {
    params: { ...params, format: "json" },
  });
  return data.data.rows;
}

export function downloadAppointmentReport(params: ReportFiltersParams, format: "pdf" | "excel"): Promise<void> {
  return downloadReportExport("/reports/appointments", params, format, "appointment-report");
}

export async function getRevenueReport(params: ReportFiltersParams): Promise<RevenueReportResult> {
  const { data } = await api.get<ApiSuccessResponse<RevenueReportResult>>("/reports/revenue", {
    params: { ...params, format: "json" },
  });
  return data.data;
}

export function downloadRevenueReport(params: ReportFiltersParams, format: "pdf" | "excel"): Promise<void> {
  return downloadReportExport("/reports/revenue", params, format, "revenue-report");
}

export async function getPatientReport(params: ReportFiltersParams): Promise<PatientReportResult> {
  const { data } = await api.get<ApiSuccessResponse<PatientReportResult>>("/reports/patients", {
    params: { ...params, format: "json" },
  });
  return data.data;
}

export function downloadPatientReport(params: ReportFiltersParams, format: "pdf" | "excel"): Promise<void> {
  return downloadReportExport("/reports/patients", params, format, "patient-report");
}

export async function getDoctorPerformanceReport(
  params: ReportFiltersParams
): Promise<DoctorPerformanceReportRow[]> {
  const { data } = await api.get<ApiSuccessResponse<{ rows: DoctorPerformanceReportRow[] }>>(
    "/reports/doctor-performance",
    { params: { ...params, format: "json" } }
  );
  return data.data.rows;
}

export function downloadDoctorPerformanceReport(
  params: ReportFiltersParams,
  format: "pdf" | "excel"
): Promise<void> {
  return downloadReportExport("/reports/doctor-performance", params, format, "doctor-performance-report");
}

export async function getFollowUpReport(params: ReportFiltersParams): Promise<FollowUpReportRow[]> {
  const { data } = await api.get<ApiSuccessResponse<{ rows: FollowUpReportRow[] }>>("/reports/follow-ups", {
    params: { ...params, format: "json" },
  });
  return data.data.rows;
}

export function downloadFollowUpReport(params: ReportFiltersParams, format: "pdf" | "excel"): Promise<void> {
  return downloadReportExport("/reports/follow-ups", params, format, "follow-up-report");
}
