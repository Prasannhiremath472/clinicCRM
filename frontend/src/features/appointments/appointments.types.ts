export type AppointmentType = "WALK_IN" | "ONLINE";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "WAITING"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface AppointmentPatient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
}

export interface AppointmentDoctorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface AppointmentDoctor {
  id: string;
  doctorCode: string;
  specialization: string;
  consultationFee: string;
  user: AppointmentDoctorUser;
}

export interface AppointmentCreatedBy {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Appointment {
  id: string;
  appointmentCode: string;
  clinicId: string;
  patientId: string;
  patient: AppointmentPatient;
  doctorId: string;
  doctor: AppointmentDoctor;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  cancelReason: string | null;
  createdById: string;
  createdBy: AppointmentCreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

export interface AvailabilityResult {
  available: boolean;
  slots: AvailabilitySlot[];
}

export interface ListAppointmentsParams {
  page?: number;
  pageSize?: number;
  date?: string;
  fromDate?: string;
  toDate?: string;
  doctorId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  sortBy?: "appointmentDate" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CheckAvailabilityParams {
  doctorId: string;
  date: string;
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  type?: AppointmentType;
  notes?: string;
}

export interface RescheduleAppointmentPayload {
  appointmentDate: string;
  startTime: string;
}

export interface CancelAppointmentPayload {
  cancelReason?: string;
}

export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatus;
}
