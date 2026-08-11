import type { AppointmentStatus } from "@/features/appointments/appointments.types";

/**
 * Mirrors the backend's forward-only status transition map
 * (backend/src/modules/appointments/appointment.service.ts) so the UI can present only
 * legally-reachable next states. The backend remains the source of truth and re-validates
 * on every request.
 */
export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "WAITING", "IN_CONSULTATION", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CONFIRMED", "WAITING", "IN_CONSULTATION", "CANCELLED", "NO_SHOW"],
  WAITING: ["CONFIRMED", "WAITING", "IN_CONSULTATION", "CANCELLED", "NO_SHOW"],
  IN_CONSULTATION: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};
