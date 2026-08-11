import type { AppointmentStatus, AppointmentType } from "@/features/appointments/appointments.types";

export interface ConsultationPatient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
}

export interface ConsultationDoctorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface ConsultationDoctor {
  id: string;
  doctorCode: string;
  specialization: string;
  user: ConsultationDoctorUser;
}

export interface ConsultationAppointment {
  id: string;
  appointmentCode: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: AppointmentType;
}

export interface Consultation {
  id: string;
  appointmentId: string;
  patientId: string;
  patient: ConsultationPatient;
  doctorId: string;
  doctor: ConsultationDoctor;
  doctorUserId: string;
  appointment: ConsultationAppointment;
  heightCm: string | null;
  weightKg: string | null;
  bloodPressure: string | null;
  temperatureF: string | null;
  pulseRate: number | null;
  oxygenSaturation: number | null;
  symptoms: string | null;
  diagnosis: string | null;
  clinicalNotes: string | null;
  recommendedTests: string | null;
  treatmentPlan: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListConsultationsParams {
  page?: number;
  pageSize?: number;
  patientId?: string;
  doctorId?: string;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface UpdateConsultationPayload {
  heightCm?: number;
  weightKg?: number;
  bloodPressure?: string;
  temperatureF?: number;
  pulseRate?: number;
  oxygenSaturation?: number;
  symptoms?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  recommendedTests?: string;
  treatmentPlan?: string;
}
