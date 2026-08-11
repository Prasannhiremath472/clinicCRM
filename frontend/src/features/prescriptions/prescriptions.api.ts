import { api } from "@/lib/axios";
import type { ApiMeta, ApiSuccessResponse } from "@/types/api.types";
import type {
  ListPrescriptionsParams,
  Prescription,
  PrescriptionPdfResult,
  SavePrescriptionPayload,
} from "@/features/prescriptions/prescriptions.types";

export interface PrescriptionListResult {
  items: Prescription[];
  meta: ApiMeta;
}

export async function listPrescriptions(params: ListPrescriptionsParams): Promise<PrescriptionListResult> {
  const { data } = await api.get<ApiSuccessResponse<Prescription[]>>("/prescriptions", { params });
  return { items: data.data, meta: data.meta as ApiMeta };
}

export async function getPrescription(id: string): Promise<Prescription> {
  const { data } = await api.get<ApiSuccessResponse<Prescription>>(`/prescriptions/${id}`);
  return data.data;
}

export async function getPrescriptionByConsultation(consultationId: string): Promise<Prescription> {
  const { data } = await api.get<ApiSuccessResponse<Prescription>>(
    `/prescriptions/by-consultation/${consultationId}`
  );
  return data.data;
}

export async function savePrescription(
  consultationId: string,
  payload: SavePrescriptionPayload
): Promise<Prescription> {
  const { data } = await api.put<ApiSuccessResponse<Prescription>>(
    `/prescriptions/by-consultation/${consultationId}`,
    payload
  );
  return data.data;
}

export async function getPrescriptionPdf(id: string): Promise<PrescriptionPdfResult> {
  const { data } = await api.get<ApiSuccessResponse<PrescriptionPdfResult>>(`/prescriptions/${id}/pdf`);
  return data.data;
}
