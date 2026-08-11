import { Bell, LogOut, Menu, Settings, User as UserIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useLogout } from "@/features/auth/useAuth";
import { useAuthStore } from "@/store/auth.store";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/doctors": "Doctors",
  "/appointments": "Appointments",
  "/billing": "Billing",
  "/follow-ups": "Follow-ups",
  "/reports": "Reports",
  "/settings": "Settings",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  CLINIC_ADMIN: "Clinic Admin",
  DOCTOR: "Doctor",
  RECEPTIONIST: "Receptionist",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  CLINIC_ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  DOCTOR: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  RECEPTIONIST: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

interface TopbarProps {
  onMenuClick: () => void;
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.[0] ?? "";
  const last = lastName?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "U";
}

function usePageTitle() {
  const { pathname } = useLocation();
  const segment = "/" + pathname.split("/")[1];
  return ROUTE_LABELS[segment] ?? "Clinic CRM";
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const pageTitle = usePageTitle();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 gap-3">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
            Clinic CRM
          </span>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium text-foreground">{pageTitle}</span>
        </div>
        <span className="font-semibold text-sm md:hidden">{pageTitle}</span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Notification bell (visual only for now) */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-accent/60"
              aria-label="Open account menu"
            >
              <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {getInitials(user?.firstName, user?.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium leading-none">
                  {user ? `${user.firstName} ${user.lastName}` : ""}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">
                  {user ? `${user.firstName} ${user.lastName}` : ""}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {user?.email}
                </span>
                {user?.role && (
                  <span className={`mt-1 inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ROLE_COLORS[user.role] ?? ""}`}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 text-muted-foreground cursor-default" disabled>
              <UserIcon className="h-4 w-4" />
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? ""}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout.mutate()}
              className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
