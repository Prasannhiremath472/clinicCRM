import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "@/store/auth.store";
import type { Role } from "@/types/auth.types";

interface RoleGuardProps {
  allowedRoles: Role[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const role = useAuthStore((s) => s.user?.role);

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
