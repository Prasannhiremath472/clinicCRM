import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";

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
import {
  formatCurrency,
  INVOICE_STATUS_BADGE_VARIANT,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/features/billing/billing.constants";
import { RecordPaymentDialog } from "@/features/billing/components/RecordPaymentDialog";
import { useDownloadReceipt, useInvoice } from "@/features/billing/useBilling";
import { useAuthStore } from "@/store/auth.store";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const role = useAuthStore((s) => s.user?.role);
  const canManageBilling = role === "CLINIC_ADMIN" || role === "RECEPTIONIST";

  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [downloadingPaymentId, setDownloadingPaymentId] = React.useState<string | null>(null);

  const downloadReceipt = useDownloadReceipt();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
        <Button variant="outline" onClick={() => navigate("/billing")}>
          Back to billing
        </Button>
      </div>
    );
  }

  const balance = Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount));

  function handleDownloadReceipt(paymentId: string, receiptNumber: string) {
    setDownloadingPaymentId(paymentId);
    downloadReceipt.mutate(paymentId, {
      onSuccess: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${receiptNumber}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      },
      onSettled: () => setDownloadingPaymentId(null),
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/billing")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">Invoice details</p>
        </div>
        <Badge variant={INVOICE_STATUS_BADGE_VARIANT[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
        {canManageBilling && invoice.status !== "PAID" ? (
          <Button className="ml-auto" onClick={() => setPaymentDialogOpen(true)}>
            Record Payment
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium leading-none">Name</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {invoice.patient.firstName} {invoice.patient.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Patient code</p>
            <p className="mt-2 text-sm text-muted-foreground">{invoice.patient.patientCode}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Mobile</p>
            <p className="mt-2 text-sm text-muted-foreground">{invoice.patient.mobileNumber}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Invoice date</p>
            <p className="mt-2 text-sm text-muted-foreground">{formatDate(invoice.createdAt)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 space-y-1 rounded-md border p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatCurrency(invoice.discount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>+{formatCurrency(invoice.tax)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span>{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>Balance</span>
              <span>{formatCurrency(balance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Collected By</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.receiptNumber}</TableCell>
                    <TableCell>{formatDateTime(payment.paidAt)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
                    <TableCell>{payment.referenceNumber ?? "-"}</TableCell>
                    <TableCell>
                      {payment.collectedBy.firstName} {payment.collectedBy.lastName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingPaymentId === payment.id}
                        onClick={() => handleDownloadReceipt(payment.id, payment.receiptNumber)}
                      >
                        <Download className="h-4 w-4" />
                        {downloadingPaymentId === payment.id ? "Downloading..." : "Download"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecordPaymentDialog invoice={invoice} open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} />
    </div>
  );
}
