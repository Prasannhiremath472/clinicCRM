import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconBg?: string;
  iconColor?: string;
  gradientClass?: string;
  trend?: { value: number; label: string };
  /** @deprecated use iconBg/iconColor instead */
  accentClassName?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  gradientClass,
  trend,
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        gradientClass,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {trend && (
            <p className={cn("mt-1.5 text-xs font-medium", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>
              {isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>

        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}
