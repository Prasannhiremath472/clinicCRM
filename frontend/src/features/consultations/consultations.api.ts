import { api } from "@/lib/axios";
import type { ApiMeta, ApiSuccessResponse } from "@/types/api.types";
import type {
  Consultation,
  ListConsultationsParams,
  UpdateConsultationPayload,
} from "@/features/consultations/consultations.types";

export interface ConsultationListResult {
  items: Consultation[];
  meta: ApiMeta;
}

export async function listConsultations(params: ListConsultationsParams): Promise<ConsultationListResult> {
  const { data } = await api.get<ApiSuccessResponse<Consultation[]>>("/consultations", { params });
  return { items: data.data, meta: data.meta as ApiMeta };
}

export async function getConsultation(id: string): Promise<Consultation> {
  const { data } = await api.get<ApiSuccessResponse<Consultation>>(`/consultations/${id}`);
  return data.data;
}

export async function getConsultationByAppointment(appointmentId: string): Promise<Consultation> {
  const { data } = await api.get<ApiSuccessResponse<Consultation>>(
    `/consultations/by-appointment/${appointmentId}`
  );
  return data.data;
}

export async function startConsultation(appointmentId: string): Promise<Consultation> {
  const { data } = await api.post<ApiSuccessResponse<Consultation>>(`/consultations/start/${appointmentId}`);
  return data.data;
}

export async function updateConsultation(
  id: string,
  payload: UpdateConsultationPayload
): Promise<Consultation> {
  const { data } = await api.patch<ApiSuccessResponse<Consultation>>(`/consultations/${id}`, payload);
  return data.data;
}

export async function completeConsultation(id: string): Promise<Consultation> {
  const { data } = await api.patch<ApiSuccessResponse<Consultation>>(`/consultations/${id}/complete`);
  return data.data;
}
