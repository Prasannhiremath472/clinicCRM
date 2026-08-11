import { api } from "@/lib/axios";
import type { ApiMeta, ApiSuccessResponse } from "@/types/api.types";
import type {
  CreateFollowUpPayload,
  FollowUp,
  FollowUpDashboardSummary,
  ListFollowUpsParams,
  UpdateFollowUpPayload,
  UpdateFollowUpStatusPayload,
} from "@/features/followups/followups.types";

export interface FollowUpListResult {
  items: FollowUp[];
  meta: ApiMeta;
}

export async function listFollowUps(params: ListFollowUpsParams): Promise<FollowUpListResult> {
  const { data } = await api.get<ApiSuccessResponse<FollowUp[]>>("/follow-ups", { params });
  return { items: data.data, meta: data.meta as ApiMeta };
}

export async function getFollowUpDashboard(): Promise<FollowUpDashboardSummary> {
  const { data } = await api.get<ApiSuccessResponse<FollowUpDashboardSummary>>("/follow-ups/dashboard");
  return data.data;
}

export async function getFollowUp(id: string): Promise<FollowUp> {
  const { data } = await api.get<ApiSuccessResponse<FollowUp>>(`/follow-ups/${id}`);
  return data.data;
}

export async function createFollowUp(payload: CreateFollowUpPayload): Promise<FollowUp> {
  const { data } = await api.post<ApiSuccessResponse<FollowUp>>("/follow-ups", payload);
  return data.data;
}

export async function updateFollowUp(id: string, payload: UpdateFollowUpPayload): Promise<FollowUp> {
  const { data } = await api.patch<ApiSuccessResponse<FollowUp>>(`/follow-ups/${id}`, payload);
  return data.data;
}

export async function updateFollowUpStatus(id: string, payload: UpdateFollowUpStatusPayload): Promise<FollowUp> {
  const { data } = await api.patch<ApiSuccessResponse<FollowUp>>(`/follow-ups/${id}/status`, payload);
  return data.data;
}
