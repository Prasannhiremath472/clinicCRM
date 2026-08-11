import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import * as doctorsApi from "@/features/doctors/doctors.api";
import type {
  CreateDoctorPayload,
  CreateLeavePayload,
  ListDoctorsParams,
  ListLeavesParams,
  UpdateDoctorPayload,
  UpsertSchedulePayload,
} from "@/features/doctors/doctors.types";
import type { ApiErrorResponse } from "@/types/api.types";

export const DOCTORS_QUERY_KEY = ["doctors"] as const;

function doctorsListKey(filters: ListDoctorsParams) {
  return [...DOCTORS_QUERY_KEY, "list", filters] as const;
}

function doctorKey(id: string) {
  return [...DOCTORS_QUERY_KEY, "detail", id] as const;
}

function myDoctorProfileKey() {
  return [...DOCTORS_QUERY_KEY, "me"] as const;
}

function doctorScheduleKey(id: string) {
  return [...DOCTORS_QUERY_KEY, "schedule", id] as const;
}

function doctorAvailabilityKey(id: string, date: string) {
  return [...DOCTORS_QUERY_KEY, "availability", id, date] as const;
}

function doctorLeavesKey(id: string, params: ListLeavesParams) {
  return [...DOCTORS_QUERY_KEY, "leaves", id, params] as const;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.message ?? fallback;
  }
  return fallback;
}

export function useDoctorsList(filters: ListDoctorsParams) {
  return useQuery({
    queryKey: doctorsListKey(filters),
    queryFn: () => doctorsApi.listDoctors(filters),
  });
}

export function useDoctor(id: string | undefined) {
  return useQuery({
    queryKey: doctorKey(id ?? ""),
    queryFn: () => doctorsApi.getDoctor(id as string),
    enabled: !!id,
  });
}

export function useMyDoctorProfile(enabled: boolean) {
  return useQuery({
    queryKey: myDoctorProfileKey(),
    queryFn: () => doctorsApi.getMyDoctorProfile(),
    enabled,
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDoctorPayload) => doctorsApi.createDoctor(payload),
    onSuccess: () => {
      toast.success("Doctor created successfully.");
      void queryClient.invalidateQueries({ queryKey: DOCTORS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not create doctor."));
    },
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDoctorPayload }) =>
      doctorsApi.updateDoctor(id, payload),
    onSuccess: (_data, variables) => {
      toast.success("Doctor updated successfully.");
      void queryClient.invalidateQueries({ queryKey: DOCTORS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: doctorKey(variables.id) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update doctor."));
    },
  });
}

export function useDeactivateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => doctorsApi.deactivateDoctor(id),
    onSuccess: () => {
      toast.success("Doctor deactivated successfully.");
      void queryClient.invalidateQueries({ queryKey: DOCTORS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not deactivate doctor."));
    },
  });
}

export function useDoctorSchedule(id: string | undefined) {
  return useQuery({
    queryKey: doctorScheduleKey(id ?? ""),
    queryFn: () => doctorsApi.getDoctorSchedule(id as string),
    enabled: !!id,
  });
}

export function useSetDoctorSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertSchedulePayload }) =>
      doctorsApi.setDoctorSchedule(id, payload),
    onSuccess: (_data, variables) => {
      toast.success("Schedule updated successfully.");
      void queryClient.invalidateQueries({ queryKey: doctorScheduleKey(variables.id) });
      void queryClient.invalidateQueries({ queryKey: doctorKey(variables.id) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update schedule."));
    },
  });
}

export function useDoctorAvailability(id: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: doctorAvailabilityKey(id ?? "", date ?? ""),
    queryFn: () => doctorsApi.getDoctorAvailability(id as string, date as string),
    enabled: !!id && !!date,
  });
}

export function useDoctorLeaves(id: string | undefined, params: ListLeavesParams = {}) {
  return useQuery({
    queryKey: doctorLeavesKey(id ?? "", params),
    queryFn: () => doctorsApi.listDoctorLeaves(id as string, params),
    enabled: !!id,
  });
}

export function useAddDoctorLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateLeavePayload }) =>
      doctorsApi.addDoctorLeave(id, payload),
    onSuccess: (_data, variables) => {
      toast.success("Leave added successfully.");
      void queryClient.invalidateQueries({ queryKey: [...DOCTORS_QUERY_KEY, "leaves", variables.id] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not add leave."));
    },
  });
}

export function useDeleteDoctorLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, leaveId }: { id: string; leaveId: string }) =>
      doctorsApi.deleteDoctorLeave(id, leaveId),
    onSuccess: (_data, variables) => {
      toast.success("Leave removed successfully.");
      void queryClient.invalidateQueries({ queryKey: [...DOCTORS_QUERY_KEY, "leaves", variables.id] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not remove leave."));
    },
  });
}
