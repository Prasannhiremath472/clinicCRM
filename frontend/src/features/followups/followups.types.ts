export type FollowUpStatus = "PENDING" | "SENT" | "DONE" | "OVERDUE" | "CANCELLED";

export interface FollowUpPatient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
}

export interface FollowUpAppointment {
  id: string;
  appointmentCode: string;
  appointmentDate: string;
  startTime: string;
}

export interface FollowUpCreatedBy {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface FollowUp {
  id: string;
  clinicId: string;
  patientId: string;
  patient: FollowUpPatient;
  appointmentId: string | null;
  appointment: FollowUpAppointment | null;
  followUpDate: string;
  reason: string;
  status: FollowUpStatus;
  reminderSentAt: string | null;
  createdById: string;
  createdBy: FollowUpCreatedBy;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
}

export interface ListFollowUpsParams {
  page?: number;
  pageSize?: number;
  patientId?: string;
  status?: FollowUpStatus;
  fromDate?: string;
  toDate?: string;
  sortBy?: "followUpDate" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateFollowUpPayload {
  patientId: string;
  appointmentId?: string;
  followUpDate: string;
  reason: string;
}

export interface UpdateFollowUpPayload {
  followUpDate?: string;
  reason?: string;
}

export interface UpdateFollowUpStatusPayload {
  status: FollowUpStatus;
}

export interface FollowUpDashboardSummary {
  upcoming: FollowUp[];
  overdue: FollowUp[];
}
