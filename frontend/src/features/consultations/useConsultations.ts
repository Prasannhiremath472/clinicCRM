import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import * as consultationsApi from "@/features/consultations/consultations.api";
import type {
  ListConsultationsParams,
  UpdateConsultationPayload,
} from "@/features/consultations/consultations.types";
import type { ApiErrorResponse } from "@/types/api.types";

export const CONSULTATIONS_QUERY_KEY = ["consultations"] as const;

function consultationsListKey(filters: ListConsultationsParams) {
  return [...CONSULTATIONS_QUERY_KEY, "list", filters] as const;
}

function consultationKey(id: string) {
  return [...CONSULTATIONS_QUERY_KEY, "detail", id] as const;
}

function consultationByAppointmentKey(appointmentId: string) {
  return [...CONSULTATIONS_QUERY_KEY, "by-appointment", appointmentId] as const;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.message ?? fallback;
  }
  return fallback;
}

export function useConsultationsList(filters: ListConsultationsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: consultationsListKey(filters),
    queryFn: () => consultationsApi.listConsultations(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useConsultation(id: string | undefined) {
  return useQuery({
    queryKey: consultationKey(id ?? ""),
    queryFn: () => consultationsApi.getConsultation(id as string),
    enabled: !!id,
  });
}

export function useConsultationByAppointment(appointmentId: string | undefined) {
  return useQuery({
    queryKey: consultationByAppointmentKey(appointmentId ?? ""),
    queryFn: () => consultationsApi.getConsultationByAppointment(appointmentId as string),
    enabled: !!appointmentId,
    retry: false,
  });
}

export function useStartConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => consultationsApi.startConsultation(appointmentId),
    onSuccess: (data) => {
      toast.success("Consultation started.");
      void queryClient.invalidateQueries({ queryKey: CONSULTATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.setQueryData(consultationByAppointmentKey(data.appointmentId), data);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not start consultation."));
    },
  });
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateConsultationPayload }) =>
      consultationsApi.updateConsultation(id, payload),
    onSuccess: (data) => {
      toast.success("Consultation saved.");
      void queryClient.invalidateQueries({ queryKey: CONSULTATIONS_QUERY_KEY });
      queryClient.setQueryData(consultationByAppointmentKey(data.appointmentId), data);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not save consultation."));
    },
  });
}

export function useCompleteConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => consultationsApi.completeConsultation(id),
    onSuccess: (data) => {
      toast.success("Consultation completed.");
      void queryClient.invalidateQueries({ queryKey: CONSULTATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.setQueryData(consultationByAppointmentKey(data.appointmentId), data);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not complete consultation."));
    },
  });
}
