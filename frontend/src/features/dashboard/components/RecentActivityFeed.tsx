import { formatDistanceToNow } from "date-fns";
import { CalendarCheck, Receipt, UserPlus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { RecentActivityItem, RecentActivityType } from "@/features/dashboard/dashboard.types";
import { useRecentActivity } from "@/features/dashboard/useDashboard";

const ACTIVITY_ICONS: Record<RecentActivityType, typeof UserPlus> = {
  PATIENT: UserPlus,
  APPOINTMENT: CalendarCheck,
  PAYMENT: Receipt,
};

const ACTIVITY_ACCENT: Record<RecentActivityType, string> = {
  PATIENT: "text-blue-600",
  APPOINTMENT: "text-amber-600",
  PAYMENT: "text-emerald-600",
};

function ActivityRow({ item }: { item: RecentActivityItem }) {
  const Icon = ACTIVITY_ICONS[item.type];

  return (
    <div className="flex items-start gap-3 rounded-md border px-3 py-2">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", ACTIVITY_ACCENT[item.type])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{item.description}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function RecentActivityFeed() {
  const { data, isLoading, isError, refetch } = useRecentActivity();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">Could not load recent activity.</p>
            <button
              type="button"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {data.map((item) => (
              <ActivityRow key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
