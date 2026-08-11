import { api } from "@/lib/axios";
import type { ApiMeta, ApiSuccessResponse } from "@/types/api.types";
import type {
  CreatePatientPayload,
  DocumentType,
  ListPatientsParams,
  Patient,
  PatientDocument,
  PatientWithDocuments,
  UpdatePatientPayload,
} from "@/features/patients/patients.types";

export interface PatientListResult {
  items: Patient[];
  meta: ApiMeta;
}

export async function listPatients(params: ListPatientsParams): Promise<PatientListResult> {
  const { data } = await api.get<ApiSuccessResponse<Patient[]>>("/patients", { params });
  return { items: data.data, meta: data.meta as ApiMeta };
}

export async function getPatient(id: string): Promise<PatientWithDocuments> {
  const { data } = await api.get<ApiSuccessResponse<PatientWithDocuments>>(`/patients/${id}`);
  return data.data;
}

export async function createPatient(payload: CreatePatientPayload): Promise<Patient> {
  const { data } = await api.post<ApiSuccessResponse<Patient>>("/patients", payload);
  return data.data;
}

export async function updatePatient(id: string, payload: UpdatePatientPayload): Promise<Patient> {
  const { data } = await api.patch<ApiSuccessResponse<Patient>>(`/patients/${id}`, payload);
  return data.data;
}

export async function deletePatient(id: string): Promise<void> {
  await api.delete(`/patients/${id}`);
}

export async function listPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const { data } = await api.get<ApiSuccessResponse<PatientDocument[]>>(`/patients/${patientId}/documents`);
  return data.data;
}

export async function uploadPatientDocument(
  patientId: string,
  file: File,
  type: DocumentType
): Promise<PatientDocument> {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("type", type);

  const { data } = await api.post<ApiSuccessResponse<PatientDocument>>(
    `/patients/${patientId}/documents`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.data;
}

export async function deletePatientDocument(patientId: string, documentId: string): Promise<void> {
  await api.delete(`/patients/${patientId}/documents/${documentId}`);
}
