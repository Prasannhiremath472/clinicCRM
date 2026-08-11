import { z } from "zod";

const FOLLOWUP_STATUS_VALUES = ["PENDING", "SENT", "DONE", "OVERDUE", "CANCELLED"] as const;

export const followUpStatusOptions = FOLLOWUP_STATUS_VALUES;

export const createFollowUpSchema = z.object({
  patientId: z.string().uuid("Select a patient"),
  appointmentId: z.string().optional().or(z.literal("")),
  followUpDate: z.string().min(1, "Date is required"),
  reason: z.string().min(1, "Reason is required").max(1000, "Reason must be at most 1000 characters"),
});
export type CreateFollowUpFormValues = z.infer<typeof createFollowUpSchema>;

export const updateFollowUpSchema = z.object({
  followUpDate: z.string().min(1, "Date is required"),
  reason: z.string().min(1, "Reason is required").max(1000, "Reason must be at most 1000 characters"),
});
export type UpdateFollowUpFormValues = z.infer<typeof updateFollowUpSchema>;
