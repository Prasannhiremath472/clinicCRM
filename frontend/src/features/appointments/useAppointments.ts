import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import * as appointmentsApi from "@/features/appointments/appointments.api";
import type {
  CancelAppointmentPayload,
  CheckAvailabilityParams,
  CreateAppointmentPayload,
  ListAppointmentsParams,
  RescheduleAppointmentPayload,
  UpdateAppointmentStatusPayload,
} from "@/features/appointments/appointments.types";
import type { ApiErrorResponse } from "@/types/api.types";

export const APPOINTMENTS_QUERY_KEY = ["appointments"] as const;

function appointmentsListKey(filters: ListAppointmentsParams) {
  return [...APPOINTMENTS_QUERY_KEY, "list", filters] as const;
}

function appointmentKey(id: string) {
  return [...APPOINTMENTS_QUERY_KEY, "detail", id] as const;
}

function availabilityKey(params: CheckAvailabilityParams) {
  return [...APPOINTMENTS_QUERY_KEY, "availability", params] as const;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.message ?? fallback;
  }
  return fallback;
}

export function useAppointmentsList(filters: ListAppointmentsParams) {
  return useQuery({
    queryKey: appointmentsListKey(filters),
    queryFn: () => appointmentsApi.listAppointments(filters),
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: appointmentKey(id ?? ""),
    queryFn: () => appointmentsApi.getAppointment(id as string),
    enabled: !!id,
  });
}

export function useAvailability(params: Partial<CheckAvailabilityParams>) {
  const { doctorId, date } = params;
  return useQuery({
    queryKey: availabilityKey({ doctorId: doctorId ?? "", date: date ?? "" }),
    queryFn: () => appointmentsApi.checkAvailability({ doctorId: doctorId as string, date: date as string }),
    enabled: !!doctorId && !!date,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => appointmentsApi.createAppointment(payload),
    onSuccess: () => {
      toast.success("Appointment booked successfully.");
      void queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not book appointment."));
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RescheduleAppointmentPayload }) =>
      appointmentsApi.rescheduleAppointment(id, payload),
    onSuccess: (_data, variables) => {
      toast.success("Appointment rescheduled successfully.");
      void queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: appointmentKey(variables.id) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not reschedule appointment."));
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelAppointmentPayload }) =>
      appointmentsApi.cancelAppointment(id, payload),
    onSuccess: (_data, variables) => {
      toast.success("Appointment cancelled successfully.");
      void queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: appointmentKey(variables.id) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not cancel appointment."));
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentStatusPayload }) =>
      appointmentsApi.updateAppointmentStatus(id, payload),
    onSuccess: (_data, variables) => {
      toast.success("Appointment status updated successfully.");
      void queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: appointmentKey(variables.id) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update appointment status."));
    },
  });
}
