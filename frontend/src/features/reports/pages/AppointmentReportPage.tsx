import * as React from "react";
import { CalendarDays, Download, FileSpreadsheet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPOINTMENT_STATUS_BADGE_VARIANT, APPOINTMENT_STATUS_LABELS } from "@/features/appointments/appointments.constants";
import type { AppointmentStatus } from "@/features/appointments/appointments.types";
import { ReportFilters, type ReportFiltersValue, type StatusOption } from "@/features/reports/components/ReportFilters";
import { useAppointmentReport, useDownloadAppointmentReport } from "@/features/reports/useReports";

function defaultRange(): ReportFiltersValue {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: now.toISOString().slice(0, 10),
  };
}

const STATUS_OPTIONS: StatusOption[] = Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function AppointmentReportPage() {
  const [filters, setFilters] = React.useState<ReportFiltersValue>(defaultRange());

  const { data, isFetching, isError, refetch, isFetched } = useAppointmentReport(filters);
  const download = useDownloadAppointmentReport();

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Appointment Report</h1>
        <p className="text-sm text-muted-foreground">
          View appointments scheduled, completed, and cancelled over a date range
        </p>
      </div>

      <ReportFilters
        value={filters}
        onChange={setFilters}
        onRun={() => refetch()}
        isRunning={isFetching}
        showDoctorFilter
        showStatusFilter
        statusOptions={STATUS_OPTIONS}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Results</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={download.isPending}
              onClick={() => download.mutate({ params: filters, format: "pdf" })}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={download.isPending}
              onClick={() => download.mutate({ params: filters, format: "excel" })}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">Something went wrong while loading the report.</p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : !isFetched ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Run the report to see results</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Choose your filters above and click &quot;Run Report&quot;.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No appointments found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try adjusting your filters and run the report again.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.appointmentCode}>
                    <TableCell className="font-medium">{row.appointmentCode}</TableCell>
                    <TableCell>{row.patientName}</TableCell>
                    <TableCell>{row.doctorName}</TableCell>
                    <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell>{row.time}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>
                      <Badge variant={APPOINTMENT_STATUS_BADGE_VARIANT[row.status as AppointmentStatus]}>
                        {APPOINTMENT_STATUS_LABELS[row.status as AppointmentStatus]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
