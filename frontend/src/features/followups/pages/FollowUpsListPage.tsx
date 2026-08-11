import * as React from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FollowUpDashboardWidget } from "@/features/followups/components/FollowUpDashboardWidget";
import {
  FOLLOWUP_STATUS_BADGE_VARIANT,
  FOLLOWUP_STATUS_LABELS,
  getNextLegalStatuses,
} from "@/features/followups/followups.constants";
import type { FollowUp, FollowUpStatus, ListFollowUpsParams } from "@/features/followups/followups.types";
import { useFollowUpsList, useUpdateFollowUpStatus } from "@/features/followups/useFollowUps";

const ALL_VALUE = "__all__";

function formatDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function FollowUpsListPage() {
  const navigate = useNavigate();
  const updateStatus = useUpdateFollowUpStatus();

  const [status, setStatus] = React.useState<FollowUpStatus | undefined>(undefined);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [patientSearch, setPatientSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const filters: ListFollowUpsParams = {
    page,
    pageSize: 20,
    status,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    sortBy: "followUpDate",
    sortOrder: "asc",
  };

  const { data, isLoading, isError, refetch } = useFollowUpsList(filters);

  React.useEffect(() => {
    setPage(1);
  }, [status, fromDate, toDate]);

  const allItems = data?.items ?? [];
  const items = patientSearch
    ? allItems.filter((followUp) => {
        const name = `${followUp.patient.firstName} ${followUp.patient.lastName}`.toLowerCase();
        const query = patientSearch.toLowerCase();
        return (
          name.includes(query) ||
          followUp.patient.mobileNumber.includes(patientSearch) ||
          followUp.patient.patientCode.toLowerCase().includes(query)
        );
      })
    : allItems;
  const meta = data?.meta;

  function renderRow(followUp: FollowUp) {
    const nextStatuses = getNextLegalStatuses(followUp.status).filter((s) => s !== "OVERDUE");

    return (
      <TableRow key={followUp.id}>
        <TableCell className="font-medium">
          {followUp.patient.firstName} {followUp.patient.lastName}
        </TableCell>
        <TableCell>{formatDate(followUp.followUpDate)}</TableCell>
        <TableCell className="max-w-xs truncate">{followUp.reason}</TableCell>
        <TableCell>
          {followUp.isOverdue ? (
            <Badge variant="destructive">Overdue</Badge>
          ) : (
            <Badge variant={FOLLOWUP_STATUS_BADGE_VARIANT[followUp.status]}>
              {FOLLOWUP_STATUS_LABELS[followUp.status]}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap justify-end gap-2">
            {followUp.status === "PENDING" ? (
              <Button variant="outline" size="sm" onClick={() => navigate(`/follow-ups/${followUp.id}/edit`)}>
                Edit
              </Button>
            ) : null}
            {nextStatuses
              .filter((s) => s !== "CANCELLED")
              .map((nextStatus) => (
                <Button
                  key={nextStatus}
                  variant="outline"
                  size="sm"
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: followUp.id, status: nextStatus })}
                >
                  Mark {FOLLOWUP_STATUS_LABELS[nextStatus]}
                </Button>
              ))}
            {nextStatuses.includes("CANCELLED") ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: followUp.id, status: "CANCELLED" })}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">Track and action patient follow-up reminders</p>
        </div>
        <Button onClick={() => navigate("/follow-ups/new")}>
          <Plus className="h-4 w-4" />
          New Follow-up
        </Button>
      </div>

      <FollowUpDashboardWidget />

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search by patient name, code, or mobile"
              className="min-w-[220px] flex-1"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            <Input type="date" className="w-[160px]" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" className="w-[160px]" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Select
              value={status ?? ALL_VALUE}
              onValueChange={(value) => setStatus(value === ALL_VALUE ? undefined : (value as FollowUpStatus))}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
                {Object.entries(FOLLOWUP_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">Something went wrong while loading follow-ups.</p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No follow-ups found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try adjusting your search or filters, or schedule a new follow-up.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Follow-up Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{items.map(renderRow)}</TableBody>
              </Table>

              {meta ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(meta.page - 1) * meta.pageSize + 1}-
                    {Math.min(meta.page * meta.pageSize, meta.totalItems)} of {meta.totalItems}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {meta.page} of {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
