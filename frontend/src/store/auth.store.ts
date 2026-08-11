import { create } from "zustand";

import type { User } from "@/types/auth.types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  updateAccessToken: (token: string) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  updateAccessToken: (token) =>
    set({ accessToken: token, isAuthenticated: true }),
  setUser: (user) => set({ user }),
}));

/**
 * Non-reactive accessors for use outside React (e.g. axios interceptors).
 */
export const authStore = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getUser: () => useAuthStore.getState().user,
  isAuthenticated: () => useAuthStore.getState().isAuthenticated,
  setAuth: (user: User, accessToken: string) =>
    useAuthStore.getState().setAuth(user, accessToken),
  clearAuth: () => useAuthStore.getState().clearAuth(),
  updateAccessToken: (token: string) =>
    useAuthStore.getState().updateAccessToken(token),
};
