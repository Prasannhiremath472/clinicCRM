import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FollowUp } from "@/features/followups/followups.types";
import { useFollowUpsDashboard, useUpdateFollowUpStatus } from "@/features/followups/useFollowUps";

function formatDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function FollowUpDashboardWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useFollowUpsDashboard();
  const updateStatus = useUpdateFollowUpStatus();

  function renderItem(followUp: FollowUp, variant: "upcoming" | "overdue") {
    return (
      <div
        key={followUp.id}
        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
      >
        <button
          type="button"
          className="flex-1 text-left"
          onClick={() => navigate(`/follow-ups/${followUp.id}/edit`)}
        >
          <p className="text-sm font-medium">
            {followUp.patient.firstName} {followUp.patient.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(followUp.followUpDate)} &middot; {followUp.reason}
          </p>
        </button>
        <div className="flex items-center gap-2">
          {variant === "overdue" ? (
            <Badge variant="destructive">Overdue</Badge>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id: followUp.id, status: "DONE" })}
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Follow-ups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Overdue ({data?.overdue.length ?? 0})
              </h3>
              {data && data.overdue.length > 0 ? (
                <div className="space-y-2">{data.overdue.map((item) => renderItem(item, "overdue"))}</div>
              ) : (
                <p className="text-sm text-muted-foreground">No overdue follow-ups.</p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                Upcoming ({data?.upcoming.length ?? 0})
              </h3>
              {data && data.upcoming.length > 0 ? (
                <div className="space-y-2">{data.upcoming.map((item) => renderItem(item, "upcoming"))}</div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming follow-ups.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
