import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import * as prescriptionsApi from "@/features/prescriptions/prescriptions.api";
import type {
  ListPrescriptionsParams,
  SavePrescriptionPayload,
} from "@/features/prescriptions/prescriptions.types";
import type { ApiErrorResponse } from "@/types/api.types";

export const PRESCRIPTIONS_QUERY_KEY = ["prescriptions"] as const;

function prescriptionsListKey(filters: ListPrescriptionsParams) {
  return [...PRESCRIPTIONS_QUERY_KEY, "list", filters] as const;
}

function prescriptionKey(id: string) {
  return [...PRESCRIPTIONS_QUERY_KEY, "detail", id] as const;
}

function prescriptionByConsultationKey(consultationId: string) {
  return [...PRESCRIPTIONS_QUERY_KEY, "by-consultation", consultationId] as const;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.message ?? fallback;
  }
  return fallback;
}

export function usePrescriptionsList(filters: ListPrescriptionsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: prescriptionsListKey(filters),
    queryFn: () => prescriptionsApi.listPrescriptions(filters),
    enabled: options?.enabled ?? true,
  });
}

export function usePrescription(id: string | undefined) {
  return useQuery({
    queryKey: prescriptionKey(id ?? ""),
    queryFn: () => prescriptionsApi.getPrescription(id as string),
    enabled: !!id,
  });
}

export function usePrescriptionByConsultation(consultationId: string | undefined) {
  return useQuery({
    queryKey: prescriptionByConsultationKey(consultationId ?? ""),
    queryFn: () => prescriptionsApi.getPrescriptionByConsultation(consultationId as string),
    enabled: !!consultationId,
    retry: false,
  });
}

export function useSavePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consultationId, payload }: { consultationId: string; payload: SavePrescriptionPayload }) =>
      prescriptionsApi.savePrescription(consultationId, payload),
    onSuccess: (data) => {
      toast.success("Prescription saved.");
      void queryClient.invalidateQueries({ queryKey: PRESCRIPTIONS_QUERY_KEY });
      queryClient.setQueryData(prescriptionByConsultationKey(data.consultationId), data);
      queryClient.setQueryData(prescriptionKey(data.id), data);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not save prescription."));
    },
  });
}

export function usePrescriptionPdf(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...PRESCRIPTIONS_QUERY_KEY, "pdf", id ?? ""],
    queryFn: () => prescriptionsApi.getPrescriptionPdf(id as string),
    enabled: (options?.enabled ?? true) && !!id,
  });
}
