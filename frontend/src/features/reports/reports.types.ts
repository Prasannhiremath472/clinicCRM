export type ExportFormat = "json" | "pdf" | "excel";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "WAITING"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type PaymentStatus = "PAID" | "PARTIAL" | "PENDING";

export type FollowUpStatus = "PENDING" | "SENT" | "DONE" | "OVERDUE" | "CANCELLED";

export type PatientStatusFilter = "active" | "inactive";

export interface ReportFiltersParams {
  fromDate: string;
  toDate: string;
  doctorId?: string;
  patientId?: string;
  status?: string;
}

export interface AppointmentReportRow {
  appointmentCode: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  type: string;
  status: AppointmentStatus;
}

export interface RevenueReportRow {
  receiptNumber: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  method: string;
  paidAt: string;
  collectedByName: string;
}

export interface RevenueReportSummary {
  totalRevenue: number;
  paymentCount: number;
}

export interface RevenueReportResult {
  rows: RevenueReportRow[];
  summary: RevenueReportSummary;
}

export interface PatientReportRow {
  patientCode: string;
  name: string;
  gender: string;
  age: number;
  mobileNumber: string;
  registeredOn: string;
}

export interface PatientReportSummary {
  totalPatients: number;
  newInRange: number;
}

export interface PatientReportResult {
  rows: PatientReportRow[];
  summary: PatientReportSummary;
}

export interface DoctorPerformanceReportRow {
  doctorName: string;
  specialization: string;
  appointmentsCompleted: number;
  consultationsConducted: number;
  revenueGenerated: number;
}

export interface FollowUpReportRow {
  patientName: string;
  followUpDate: string;
  reason: string;
  status: FollowUpStatus;
  isOverdue: boolean;
}
