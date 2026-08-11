import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const APPOINTMENT_TYPE_VALUES = ["WALK_IN", "ONLINE"] as const;
const APPOINTMENT_STATUS_VALUES = [
  "SCHEDULED",
  "CONFIRMED",
  "WAITING",
  "IN_CONSULTATION",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export const appointmentTypeOptions = APPOINTMENT_TYPE_VALUES;
export const appointmentStatusOptions = APPOINTMENT_STATUS_VALUES;

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid("Select a patient"),
  doctorId: z.string().uuid("Select a doctor"),
  appointmentDate: z.string().min(1, "Date is required"),
  startTime: z.string().regex(timeRegex, "Select a time slot"),
  type: z.enum(APPOINTMENT_TYPE_VALUES),
  notes: z.string().optional().or(z.literal("")),
});
export type CreateAppointmentFormValues = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  appointmentDate: z.string().min(1, "Date is required"),
  startTime: z.string().regex(timeRegex, "Select a time slot"),
});
export type RescheduleAppointmentFormValues = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  cancelReason: z.string().optional().or(z.literal("")),
});
export type CancelAppointmentFormValues = z.infer<typeof cancelAppointmentSchema>;
