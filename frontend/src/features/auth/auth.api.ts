import { api } from "@/lib/axios";
import type { ApiSuccessResponse } from "@/types/api.types";
import type {
  AuthResponse,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RefreshTokenResponse,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from "@/types/auth.types";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<ApiSuccessResponse<AuthResponse>>(
    "/auth/login",
    payload,
  );
  return data.data;
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const { data } = await api.post<ApiSuccessResponse<AuthResponse>>(
    "/auth/register",
    payload,
  );
  return data.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<{ message: string }> {
  const { data } = await api.post<ApiSuccessResponse<{ message: string }>>(
    "/auth/forgot-password",
    payload,
  );
  return data.data;
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<{ message: string }> {
  const { data } = await api.post<ApiSuccessResponse<{ message: string }>>(
    "/auth/reset-password",
    payload,
  );
  return data.data;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<{ message: string }> {
  const { data } = await api.post<ApiSuccessResponse<{ message: string }>>(
    "/auth/change-password",
    payload,
  );
  return data.data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<ApiSuccessResponse<User>>("/auth/me");
  return data.data;
}

export async function refreshToken(): Promise<RefreshTokenResponse> {
  const { data } = await api.post<ApiSuccessResponse<RefreshTokenResponse>>(
    "/auth/refresh-token",
  );
  return data.data;
}
