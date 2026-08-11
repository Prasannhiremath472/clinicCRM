import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import * as followUpsApi from "@/features/followups/followups.api";
import type {
  CreateFollowUpPayload,
  FollowUpStatus,
  ListFollowUpsParams,
  UpdateFollowUpPayload,
} from "@/features/followups/followups.types";
import type { ApiErrorResponse } from "@/types/api.types";

export const FOLLOWUPS_QUERY_KEY = ["follow-ups"] as const;

function followUpsListKey(filters: ListFollowUpsParams) {
  return [...FOLLOWUPS_QUERY_KEY, "list", filters] as const;
}

function followUpKey(id: string) {
  return [...FOLLOWUPS_QUERY_KEY, "detail", id] as const;
}

function followUpDashboardKey() {
  return [...FOLLOWUPS_QUERY_KEY, "dashboard"] as const;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.message ?? fallback;
  }
  return fallback;
}

export function useFollowUpsList(filters: ListFollowUpsParams) {
  return useQuery({
    queryKey: followUpsListKey(filters),
    queryFn: () => followUpsApi.listFollowUps(filters),
  });
}

export function useFollowUp(id: string | undefined) {
  return useQuery({
    queryKey: followUpKey(id ?? ""),
    queryFn: () => followUpsApi.getFollowUp(id as string),
    enabled: !!id,
  });
}

export function useFollowUpsDashboard() {
  return useQuery({
    queryKey: followUpDashboardKey(),
    queryFn: () => followUpsApi.getFollowUpDashboard(),
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFollowUpPayload) => followUpsApi.createFollowUp(payload),
    onSuccess: () => {
      toast.success("Follow-up created successfully.");
      void queryClient.invalidateQueries({ queryKey: FOLLOWUPS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not create follow-up."));
    },
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFollowUpPayload }) =>
      followUpsApi.updateFollowUp(id, payload),
    onSuccess: (updated) => {
      toast.success("Follow-up updated successfully.");
      void queryClient.invalidateQueries({ queryKey: FOLLOWUPS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: followUpKey(updated.id) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update follow-up."));
    },
  });
}

export function useUpdateFollowUpStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FollowUpStatus }) =>
      followUpsApi.updateFollowUpStatus(id, { status }),
    onSuccess: (updated) => {
      toast.success("Follow-up status updated successfully.");
      void queryClient.invalidateQueries({ queryKey: FOLLOWUPS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: followUpKey(updated.id) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update follow-up status."));
    },
  });
}

export function useCancelFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => followUpsApi.updateFollowUpStatus(id, { status: "CANCELLED" }),
    onSuccess: (updated) => {
      toast.success("Follow-up cancelled.");
      void queryClient.invalidateQueries({ queryKey: FOLLOWUPS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: followUpKey(updated.id) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not cancel follow-up."));
    },
  });
}
