import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import * as patientsApi from "@/features/patients/patients.api";
import type {
  CreatePatientPayload,
  DocumentType,
  ListPatientsParams,
  UpdatePatientPayload,
} from "@/features/patients/patients.types";
import type { ApiErrorResponse } from "@/types/api.types";

export const PATIENTS_QUERY_KEY = ["patients"] as const;

function patientsListKey(filters: ListPatientsParams) {
  return [...PATIENTS_QUERY_KEY, "list", filters] as const;
}

function patientKey(id: string) {
  return [...PATIENTS_QUERY_KEY, "detail", id] as const;
}

function patientDocumentsKey(id: string) {
  return [...PATIENTS_QUERY_KEY, "documents", id] as const;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.message ?? fallback;
  }
  return fallback;
}

export function usePatientsList(filters: ListPatientsParams) {
  return useQuery({
    queryKey: patientsListKey(filters),
    queryFn: () => patientsApi.listPatients(filters),
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: patientKey(id ?? ""),
    queryFn: () => patientsApi.getPatient(id as string),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePatientPayload) => patientsApi.createPatient(payload),
    onSuccess: () => {
      toast.success("Patient registered successfully.");
      void queryClient.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not register patient."));
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePatientPayload }) =>
      patientsApi.updatePatient(id, payload),
    onSuccess: (_data, variables) => {
      toast.success("Patient updated successfully.");
      void queryClient.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: patientKey(variables.id) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update patient."));
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patientsApi.deletePatient(id),
    onSuccess: () => {
      toast.success("Patient deleted successfully.");
      void queryClient.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not delete patient."));
    },
  });
}

export function usePatientDocuments(patientId: string | undefined) {
  return useQuery({
    queryKey: patientDocumentsKey(patientId ?? ""),
    queryFn: () => patientsApi.listPatientDocuments(patientId as string),
    enabled: !!patientId,
  });
}

export function useUploadPatientDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, file, type }: { patientId: string; file: File; type: DocumentType }) =>
      patientsApi.uploadPatientDocument(patientId, file, type),
    onSuccess: (_data, variables) => {
      toast.success("Document uploaded successfully.");
      void queryClient.invalidateQueries({ queryKey: patientDocumentsKey(variables.patientId) });
      void queryClient.invalidateQueries({ queryKey: patientKey(variables.patientId) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not upload document."));
    },
  });
}

export function useDeletePatientDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, documentId }: { patientId: string; documentId: string }) =>
      patientsApi.deletePatientDocument(patientId, documentId),
    onSuccess: (_data, variables) => {
      toast.success("Document deleted successfully.");
      void queryClient.invalidateQueries({ queryKey: patientDocumentsKey(variables.patientId) });
      void queryClient.invalidateQueries({ queryKey: patientKey(variables.patientId) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not delete document."));
    },
  });
}
