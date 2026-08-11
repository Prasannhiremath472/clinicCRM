import { Navigate } from "react-router-dom";

import { useAuthStore } from "@/store/auth.store";

export function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}
