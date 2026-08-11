import { api } from "@/lib/axios";
import type { ApiMeta, ApiSuccessResponse } from "@/types/api.types";
import type {
  CreateInvoicePayload,
  Invoice,
  ListInvoicesParams,
  Payment,
  RecordPaymentPayload,
  RevenueSummary,
  RevenueSummaryParams,
  SuggestedInvoiceItem,
} from "@/features/billing/billing.types";

export interface InvoiceListResult {
  items: Invoice[];
  meta: ApiMeta;
}

export async function listInvoices(params: ListInvoicesParams): Promise<InvoiceListResult> {
  const { data } = await api.get<ApiSuccessResponse<Invoice[]>>("/invoices", { params });
  return { items: data.data, meta: data.meta as ApiMeta };
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await api.get<ApiSuccessResponse<Invoice>>(`/invoices/${id}`);
  return data.data;
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const { data } = await api.post<ApiSuccessResponse<Invoice>>("/invoices", payload);
  return data.data;
}

export async function getRevenueSummary(params: RevenueSummaryParams): Promise<RevenueSummary> {
  const { data } = await api.get<ApiSuccessResponse<RevenueSummary>>("/invoices/summary/revenue", { params });
  return data.data;
}

export async function getOutstandingInvoices(): Promise<Invoice[]> {
  const { data } = await api.get<ApiSuccessResponse<Invoice[]>>("/invoices/summary/outstanding");
  return data.data;
}

export async function suggestInvoiceItems(appointmentId: string): Promise<SuggestedInvoiceItem[]> {
  const { data } = await api.get<ApiSuccessResponse<SuggestedInvoiceItem[]>>("/invoices/suggest-items", {
    params: { appointmentId },
  });
  return data.data;
}

export async function recordPayment(invoiceId: string, payload: RecordPaymentPayload): Promise<Payment> {
  const { data } = await api.post<ApiSuccessResponse<Payment>>(`/invoices/${invoiceId}/payments`, payload);
  return data.data;
}

export async function listPaymentsForInvoice(invoiceId: string): Promise<Payment[]> {
  const { data } = await api.get<ApiSuccessResponse<Payment[]>>(`/invoices/${invoiceId}/payments`);
  return data.data;
}

export async function downloadPaymentReceipt(paymentId: string): Promise<Blob> {
  const { data } = await api.get(`/payments/${paymentId}/receipt`, { responseType: "blob" });
  return data;
}
