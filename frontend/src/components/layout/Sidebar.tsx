import {
  Activity,
  CalendarClock,
  CalendarDays,
  FileBarChart,
  LayoutDashboard,
  Receipt,
  Settings,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import type { Role } from "@/types/auth.types";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  {
    label: "Patients",
    to: "/patients",
    icon: Users,
    roles: ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"],
  },
  {
    label: "Doctors",
    to: "/doctors",
    icon: Stethoscope,
    roles: ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"],
  },
  {
    label: "Appointments",
    to: "/appointments",
    icon: CalendarDays,
    roles: ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"],
  },
  {
    label: "Billing",
    to: "/billing",
    icon: Receipt,
    roles: ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"],
  },
  {
    label: "Follow-ups",
    to: "/follow-ups",
    icon: CalendarClock,
    roles: ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"],
  },
  {
    label: "Reports",
    to: "/reports",
    icon: FileBarChart,
    roles: ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"],
  },
  { label: "Settings", to: "/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  return (
    <nav
      className={cn(
        "sidebar-bg flex h-full flex-col",
        className,
      )}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Clinic CRM</p>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Healthcare Suite</p>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "text-white/55 hover:bg-white/10 hover:text-white/90",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-white" : "text-white/50 group-hover:text-white/80")} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/30 text-xs font-semibold text-primary-foreground">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/80">
              {user ? `${user.firstName} ${user.lastName}` : ""}
            </p>
            <p className="truncate text-[10px] text-white/40">{user?.role?.replace("_", " ")}</p>
          </div>
        </div>
      </div>
    </nav>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute left-0 top-0 h-full w-64 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-3 top-4 z-10 rounded-md p-1 text-white/60 hover:text-white/90"
        >
          <X className="h-4 w-4" />
        </button>
        <Sidebar className="h-full" onNavigate={onClose} />
      </div>
    </div>
  );
}
