import { api } from "@/lib/axios";
import type { ApiMeta, ApiSuccessResponse } from "@/types/api.types";
import type {
  AvailabilityResult,
  CreateDoctorPayload,
  CreateLeavePayload,
  Doctor,
  DoctorLeave,
  DoctorSchedule,
  DoctorWithSchedules,
  ListDoctorsParams,
  ListLeavesParams,
  UpdateDoctorPayload,
  UpsertSchedulePayload,
} from "@/features/doctors/doctors.types";

export interface DoctorListResult {
  items: Doctor[];
  meta: ApiMeta;
}

export async function listDoctors(params: ListDoctorsParams): Promise<DoctorListResult> {
  const { data } = await api.get<ApiSuccessResponse<Doctor[]>>("/doctors", { params });
  return { items: data.data, meta: data.meta as ApiMeta };
}

export async function getDoctor(id: string): Promise<DoctorWithSchedules> {
  const { data } = await api.get<ApiSuccessResponse<DoctorWithSchedules>>(`/doctors/${id}`);
  return data.data;
}

export async function getMyDoctorProfile(): Promise<DoctorWithSchedules> {
  const { data } = await api.get<ApiSuccessResponse<DoctorWithSchedules>>("/doctors/me");
  return data.data;
}

export async function createDoctor(payload: CreateDoctorPayload): Promise<Doctor> {
  const { data } = await api.post<ApiSuccessResponse<Doctor>>("/doctors", payload);
  return data.data;
}

export async function updateDoctor(id: string, payload: UpdateDoctorPayload): Promise<Doctor> {
  const { data } = await api.patch<ApiSuccessResponse<Doctor>>(`/doctors/${id}`, payload);
  return data.data;
}

export async function deactivateDoctor(id: string): Promise<void> {
  await api.delete(`/doctors/${id}`);
}

export async function getDoctorSchedule(id: string): Promise<DoctorSchedule[]> {
  const { data } = await api.get<ApiSuccessResponse<DoctorSchedule[]>>(`/doctors/${id}/schedule`);
  return data.data;
}

export async function setDoctorSchedule(
  id: string,
  payload: UpsertSchedulePayload
): Promise<DoctorSchedule[]> {
  const { data } = await api.put<ApiSuccessResponse<DoctorSchedule[]>>(`/doctors/${id}/schedule`, payload);
  return data.data;
}

export async function getDoctorAvailability(id: string, date: string): Promise<AvailabilityResult> {
  const { data } = await api.get<ApiSuccessResponse<AvailabilityResult>>(`/doctors/${id}/availability`, {
    params: { date },
  });
  return data.data;
}

export async function listDoctorLeaves(id: string, params: ListLeavesParams = {}): Promise<DoctorLeave[]> {
  const { data } = await api.get<ApiSuccessResponse<DoctorLeave[]>>(`/doctors/${id}/leaves`, { params });
  return data.data;
}

export async function addDoctorLeave(id: string, payload: CreateLeavePayload): Promise<DoctorLeave> {
  const { data } = await api.post<ApiSuccessResponse<DoctorLeave>>(`/doctors/${id}/leaves`, payload);
  return data.data;
}

export async function deleteDoctorLeave(id: string, leaveId: string): Promise<void> {
  await api.delete(`/doctors/${id}/leaves/${leaveId}`);
}
