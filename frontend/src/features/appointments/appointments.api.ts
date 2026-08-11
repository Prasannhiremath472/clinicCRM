import { api } from "@/lib/axios";
import type { ApiMeta, ApiSuccessResponse } from "@/types/api.types";
import type {
  Appointment,
  AvailabilityResult,
  CancelAppointmentPayload,
  CheckAvailabilityParams,
  CreateAppointmentPayload,
  ListAppointmentsParams,
  RescheduleAppointmentPayload,
  UpdateAppointmentStatusPayload,
} from "@/features/appointments/appointments.types";

export interface AppointmentListResult {
  items: Appointment[];
  meta: ApiMeta;
}

export async function listAppointments(params: ListAppointmentsParams): Promise<AppointmentListResult> {
  const { data } = await api.get<ApiSuccessResponse<Appointment[]>>("/appointments", { params });
  return { items: data.data, meta: data.meta as ApiMeta };
}

export async function getAppointment(id: string): Promise<Appointment> {
  const { data } = await api.get<ApiSuccessResponse<Appointment>>(`/appointments/${id}`);
  return data.data;
}

export async function checkAvailability(params: CheckAvailabilityParams): Promise<AvailabilityResult> {
  const { data } = await api.get<ApiSuccessResponse<AvailabilityResult>>("/appointments/availability", {
    params,
  });
  return data.data;
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
  const { data } = await api.post<ApiSuccessResponse<Appointment>>("/appointments", payload);
  return data.data;
}

export async function rescheduleAppointment(
  id: string,
  payload: RescheduleAppointmentPayload
): Promise<Appointment> {
  const { data } = await api.patch<ApiSuccessResponse<Appointment>>(`/appointments/${id}/reschedule`, payload);
  return data.data;
}

export async function cancelAppointment(id: string, payload: CancelAppointmentPayload): Promise<Appointment> {
  const { data } = await api.patch<ApiSuccessResponse<Appointment>>(`/appointments/${id}/cancel`, payload);
  return data.data;
}

export async function updateAppointmentStatus(
  id: string,
  payload: UpdateAppointmentStatusPayload
): Promise<Appointment> {
  const { data } = await api.patch<ApiSuccessResponse<Appointment>>(`/appointments/${id}/status`, payload);
  return data.data;
}
