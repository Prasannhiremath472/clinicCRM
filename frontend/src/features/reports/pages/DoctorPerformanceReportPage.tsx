import * as React from "react";
import { Download, FileSpreadsheet, Stethoscope } from "lucide-react";

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
import { formatCurrency } from "@/features/billing/billing.constants";
import { ReportFilters, type ReportFiltersValue } from "@/features/reports/components/ReportFilters";
import { useDoctorPerformanceReport, useDownloadDoctorPerformanceReport } from "@/features/reports/useReports";

function defaultRange(): ReportFiltersValue {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: now.toISOString().slice(0, 10),
  };
}

export function DoctorPerformanceReportPage() {
  const [filters, setFilters] = React.useState<ReportFiltersValue>(defaultRange());

  const { data, isFetching, isError, refetch, isFetched } = useDoctorPerformanceReport(filters);
  const download = useDownloadDoctorPerformanceReport();

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Doctor Performance Report</h1>
        <p className="text-sm text-muted-foreground">
          Compare appointments, consultations, and revenue generated per doctor
        </p>
      </div>

      <ReportFilters value={filters} onChange={setFilters} onRun={() => refetch()} isRunning={isFetching} showDoctorFilter />

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
              <Stethoscope className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Run the report to see results</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Choose your filters above and click &quot;Run Report&quot;.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Stethoscope className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No doctors found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try adjusting your filters and run the report again.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Appointments Completed</TableHead>
                  <TableHead>Consultations Conducted</TableHead>
                  <TableHead>Revenue Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.doctorName}>
                    <TableCell className="font-medium">{row.doctorName}</TableCell>
                    <TableCell>{row.specialization}</TableCell>
                    <TableCell>{row.appointmentsCompleted}</TableCell>
                    <TableCell>{row.consultationsConducted}</TableCell>
                    <TableCell>{formatCurrency(row.revenueGenerated)}</TableCell>
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
