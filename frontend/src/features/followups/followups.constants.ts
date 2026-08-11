import type { BadgeProps } from "@/components/ui/badge";
import type { FollowUpStatus } from "@/features/followups/followups.types";
import { FOLLOWUP_STATUS_TRANSITIONS } from "@/features/followups/statusTransitions";

export const FOLLOWUP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  PENDING: "Pending",
  SENT: "Reminder Sent",
  DONE: "Done",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const FOLLOWUP_STATUS_BADGE_VARIANT: Record<FollowUpStatus, NonNullable<BadgeProps["variant"]>> = {
  PENDING: "secondary",
  SENT: "default",
  DONE: "success",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

export function getNextLegalStatuses(current: FollowUpStatus): FollowUpStatus[] {
  return FOLLOWUP_STATUS_TRANSITIONS[current];
}
