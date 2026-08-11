export type WeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type Role = "SUPER_ADMIN" | "CLINIC_ADMIN" | "DOCTOR" | "RECEPTIONIST";

export interface DoctorUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Doctor {
  id: string;
  doctorCode: string;
  clinicId: string;
  userId: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  consultationFee: string;
  signatureUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: DoctorUser;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  weekDay: WeekDay;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorWithSchedules extends Doctor {
  schedules: DoctorSchedule[];
}

export interface DoctorLeave {
  id: string;
  doctorId: string;
  date: string;
  reason: string | null;
  createdAt: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

export interface AvailabilityResult {
  available: boolean;
  slots: AvailabilitySlot[];
}

export interface ListDoctorsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  specialization?: string;
  isActive?: boolean;
  sortBy?: "createdAt" | "firstName" | "experienceYears";
  sortOrder?: "asc" | "desc";
}

export interface CreateDoctorPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  consultationFee: number;
}

export interface UpdateDoctorPayload {
  qualification?: string;
  specialization?: string;
  experienceYears?: number;
  consultationFee?: number;
  isActive?: boolean;
}

export interface ScheduleEntryPayload {
  weekDay: WeekDay;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

export interface UpsertSchedulePayload {
  schedules: ScheduleEntryPayload[];
}

export interface CreateLeavePayload {
  date: string;
  reason?: string;
}

export interface ListLeavesParams {
  fromDate?: string;
  toDate?: string;
}
