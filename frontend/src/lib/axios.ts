import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { authStore } from "@/store/auth.store";
import type { ApiErrorResponse } from "@/types/api.types";
import type { RefreshTokenResponse } from "@/types/auth.types";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Endpoints that must never trigger a refresh-and-retry cycle.
const AUTH_EXEMPT_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
  "/auth/forgot-password",
  "/auth/reset-password",
];

function isAuthExempt(url?: string): boolean {
  if (!url) return false;
  return AUTH_EXEMPT_PATHS.some((path) => url.includes(path));
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStore.getAccessToken();
  if (token && !isAuthExempt(config.url)) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  try {
    const response = await axios.post<{ data: RefreshTokenResponse }>(
      `${baseURL}/auth/refresh-token`,
      {},
      { withCredentials: true },
    );
    const { accessToken } = response.data.data;
    authStore.updateAccessToken(accessToken);
    return accessToken;
  } catch {
    authStore.clearAuth();
    return null;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const exempt = isAuthExempt(originalRequest.url);

    if (status === 401 && !originalRequest._retry && !exempt) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = performRefresh();
      }

      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
        return api(originalRequest);
      }

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);
