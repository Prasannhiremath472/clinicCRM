import * as React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  formatCurrency,
  INVOICE_STATUS_BADGE_VARIANT,
  INVOICE_STATUS_LABELS,
} from "@/features/billing/billing.constants";
import type { Invoice, ListInvoicesParams, PaymentStatus } from "@/features/billing/billing.types";
import { useInvoicesList, useOutstandingInvoices, useRevenueSummary } from "@/features/billing/useBilling";
import { useAuthStore } from "@/store/auth.store";

const ALL_VALUE = "__all__";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function todayRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { fromDate: start.toISOString(), toDate: end.toISOString() };
}

function monthRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { fromDate: start.toISOString(), toDate: end.toISOString() };
}

export function InvoicesListPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canManageBilling = role === "CLINIC_ADMIN" || role === "RECEPTIONIST";

  const [activeTab, setActiveTab] = React.useState<"all" | "outstanding">("all");
  const [status, setStatus] = React.useState<PaymentStatus | undefined>(undefined);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [patientSearch, setPatientSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const todayRangeValue = React.useMemo(() => todayRange(), []);
  const monthRangeValue = React.useMemo(() => monthRange(), []);

  const { data: todaySummary } = useRevenueSummary(todayRangeValue);
  const { data: monthSummary } = useRevenueSummary(monthRangeValue);

  const filters: ListInvoicesParams = {
    page,
    pageSize: 20,
    status,
    fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
    toDate: toDate ? new Date(toDate).toISOString() : undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  };

  const { data, isLoading, isError, refetch } = useInvoicesList(filters);
  const { data: outstandingInvoices, isLoading: isOutstandingLoading } = useOutstandingInvoices({
    enabled: activeTab === "outstanding",
  });

  React.useEffect(() => {
    setPage(1);
  }, [status, fromDate, toDate]);

  const allItems = activeTab === "outstanding" ? outstandingInvoices ?? [] : data?.items ?? [];
  const items = patientSearch
    ? allItems.filter((invoice) => {
        const name = `${invoice.patient.firstName} ${invoice.patient.lastName}`.toLowerCase();
        const query = patientSearch.toLowerCase();
        return (
          name.includes(query) ||
          invoice.patient.mobileNumber.includes(patientSearch) ||
          invoice.patient.patientCode.toLowerCase().includes(query) ||
          invoice.invoiceNumber.toLowerCase().includes(query)
        );
      })
    : allItems;
  const meta = activeTab === "all" ? data?.meta : undefined;
  const loading = activeTab === "outstanding" ? isOutstandingLoading : isLoading;

  function renderRow(invoice: Invoice) {
    const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    return (
      <TableRow key={invoice.id} className="cursor-pointer" onClick={() => navigate(`/billing/${invoice.id}`)}>
        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
        <TableCell>
          {invoice.patient.firstName} {invoice.patient.lastName}
        </TableCell>
        <TableCell>{formatDate(invoice.createdAt)}</TableCell>
        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
        <TableCell>{formatCurrency(invoice.paidAmount)}</TableCell>
        <TableCell>{formatCurrency(Math.max(0, balance))}</TableCell>
        <TableCell>
          <Badge variant={INVOICE_STATUS_BADGE_VARIANT[invoice.status]}>
            {INVOICE_STATUS_LABELS[invoice.status]}
          </Badge>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Manage invoices and payments for your clinic</p>
        </div>
        {canManageBilling ? (
          <Button onClick={() => navigate("/billing/new")}>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Revenue</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todaySummary?.totalRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{todaySummary?.paymentCount ?? 0} payments collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month&apos;s Revenue</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthSummary?.totalRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{monthSummary?.paymentCount ?? 0} payments collected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              All Invoices
            </Button>
            <Button
              variant={activeTab === "outstanding" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("outstanding")}
            >
              Outstanding
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search by patient or invoice number"
              className="min-w-[220px] flex-1"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />

            {activeTab === "all" ? (
              <>
                <Input type="date" className="w-[160px]" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <Input type="date" className="w-[160px]" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <Select
                  value={status ?? ALL_VALUE}
                  onValueChange={(value) => setStatus(value === ALL_VALUE ? undefined : (value as PaymentStatus))}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
                    {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError && activeTab === "all" ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">Something went wrong while loading invoices.</p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No invoices found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {activeTab === "outstanding"
                  ? "There are no outstanding payments right now."
                  : "Try adjusting your search or filters, or create a new invoice."}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
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
