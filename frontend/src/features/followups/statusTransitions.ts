import type { FollowUpStatus } from "@/features/followups/followups.types";

/**
 * Mirrors the backend's forward-only status transition map
 * (backend/src/modules/followups/followup.service.ts) so the UI can present only
 * legally-reachable next states. The backend remains the source of truth and re-validates
 * on every request.
 */
export const FOLLOWUP_STATUS_TRANSITIONS: Record<FollowUpStatus, FollowUpStatus[]> = {
  PENDING: ["SENT", "DONE", "OVERDUE", "CANCELLED"],
  SENT: ["DONE", "CANCELLED", "OVERDUE"],
  OVERDUE: ["DONE", "CANCELLED", "SENT"],
  DONE: [],
  CANCELLED: [],
};
