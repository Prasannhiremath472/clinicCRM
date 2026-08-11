import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import * as billingApi from "@/features/billing/billing.api";
import type {
  CreateInvoicePayload,
  ListInvoicesParams,
  RecordPaymentPayload,
  RevenueSummaryParams,
} from "@/features/billing/billing.types";
import type { ApiErrorResponse } from "@/types/api.types";

export const INVOICES_QUERY_KEY = ["invoices"] as const;

function invoicesListKey(filters: ListInvoicesParams) {
  return [...INVOICES_QUERY_KEY, "list", filters] as const;
}

function invoiceKey(id: string) {
  return [...INVOICES_QUERY_KEY, "detail", id] as const;
}

function invoicePaymentsKey(invoiceId: string) {
  return [...INVOICES_QUERY_KEY, "payments", invoiceId] as const;
}

function revenueSummaryKey(params: RevenueSummaryParams) {
  return [...INVOICES_QUERY_KEY, "revenue-summary", params] as const;
}

function outstandingInvoicesKey() {
  return [...INVOICES_QUERY_KEY, "outstanding"] as const;
}

function suggestItemsKey(appointmentId: string) {
  return [...INVOICES_QUERY_KEY, "suggest-items", appointmentId] as const;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.message ?? fallback;
  }
  return fallback;
}

export function useInvoicesList(filters: ListInvoicesParams) {
  return useQuery({
    queryKey: invoicesListKey(filters),
    queryFn: () => billingApi.listInvoices(filters),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: invoiceKey(id ?? ""),
    queryFn: () => billingApi.getInvoice(id as string),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => billingApi.createInvoice(payload),
    onSuccess: () => {
      toast.success("Invoice created successfully.");
      void queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not create invoice."));
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: RecordPaymentPayload }) =>
      billingApi.recordPayment(invoiceId, payload),
    onSuccess: (_data, variables) => {
      toast.success("Payment recorded successfully.");
      void queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: invoiceKey(variables.invoiceId) });
      void queryClient.invalidateQueries({ queryKey: invoicePaymentsKey(variables.invoiceId) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not record payment."));
    },
  });
}

export function useInvoicePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: invoicePaymentsKey(invoiceId ?? ""),
    queryFn: () => billingApi.listPaymentsForInvoice(invoiceId as string),
    enabled: !!invoiceId,
  });
}

export function useRevenueSummary(params: RevenueSummaryParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: revenueSummaryKey(params),
    queryFn: () => billingApi.getRevenueSummary(params),
    enabled: options?.enabled ?? true,
  });
}

export function useOutstandingInvoices(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: outstandingInvoicesKey(),
    queryFn: () => billingApi.getOutstandingInvoices(),
    enabled: options?.enabled ?? true,
  });
}

export function useSuggestInvoiceItems(appointmentId: string | undefined) {
  return useQuery({
    queryKey: suggestItemsKey(appointmentId ?? ""),
    queryFn: () => billingApi.suggestInvoiceItems(appointmentId as string),
    enabled: !!appointmentId,
  });
}

export function useDownloadReceipt() {
  return useMutation({
    mutationFn: (paymentId: string) => billingApi.downloadPaymentReceipt(paymentId),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not download receipt."));
    },
  });
}
