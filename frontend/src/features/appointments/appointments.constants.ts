import type { BadgeProps } from "@/components/ui/badge";
import type { AppointmentStatus, AppointmentType } from "@/features/appointments/appointments.types";
import { APPOINTMENT_STATUS_TRANSITIONS } from "@/features/appointments/statusTransitions";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  WAITING: "Waiting",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  WALK_IN: "Walk-in",
  ONLINE: "Online",
};

export const APPOINTMENT_STATUS_BADGE_VARIANT: Record<AppointmentStatus, NonNullable<BadgeProps["variant"]>> = {
  SCHEDULED: "secondary",
  CONFIRMED: "default",
  WAITING: "outline",
  IN_CONSULTATION: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export function getNextLegalStatuses(current: AppointmentStatus): AppointmentStatus[] {
  return APPOINTMENT_STATUS_TRANSITIONS[current];
}
