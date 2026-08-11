import * as React from "react";
import { Download, FileSpreadsheet, Receipt } from "lucide-react";

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
import { ReportFilters, type ReportFiltersValue, type StatusOption } from "@/features/reports/components/ReportFilters";
import { useDownloadRevenueReport, useRevenueReport } from "@/features/reports/useReports";

function defaultRange(): ReportFiltersValue {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: now.toISOString().slice(0, 10),
  };
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partially Paid" },
  { value: "PENDING", label: "Pending" },
];

export function RevenueReportPage() {
  const [filters, setFilters] = React.useState<ReportFiltersValue>(defaultRange());

  const { data, isFetching, isError, refetch, isFetched } = useRevenueReport(filters);
  const download = useDownloadRevenueReport();

  const rows = data?.rows ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue Report</h1>
        <p className="text-sm text-muted-foreground">
          Track payments collected and revenue trends for your clinic
        </p>
      </div>

      <ReportFilters
        value={filters}
        onChange={setFilters}
        onRun={() => refetch()}
        isRunning={isFetching}
        showDoctorFilter
        showPatientFilter
        showStatusFilter
        statusOptions={STATUS_OPTIONS}
      />

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Payment Count</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.paymentCount}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

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
              <Receipt className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Run the report to see results</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Choose your filters above and click &quot;Run Report&quot;.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No payments found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try adjusting your filters and run the report again.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead>Collected By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.receiptNumber}>
                    <TableCell className="font-medium">{row.receiptNumber}</TableCell>
                    <TableCell>{row.invoiceNumber}</TableCell>
                    <TableCell>{row.patientName}</TableCell>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                    <TableCell>{row.method}</TableCell>
                    <TableCell>{new Date(row.paidAt).toLocaleString()}</TableCell>
                    <TableCell>{row.collectedByName}</TableCell>
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
