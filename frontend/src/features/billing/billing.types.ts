export type PaymentStatus = "PAID" | "PARTIAL" | "PENDING";

export type PaymentMethod = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";

export interface InvoicePatient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
}

export interface InvoiceCreatedBy {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
}

export interface PaymentCollectedBy {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  amount: string;
  method: PaymentMethod;
  referenceNumber: string | null;
  collectedById: string;
  collectedBy: PaymentCollectedBy;
  paidAt: string;
  notes: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clinicId: string;
  patientId: string;
  patient: InvoicePatient;
  appointmentId: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  totalAmount: string;
  paidAmount: string;
  status: PaymentStatus;
  createdById: string;
  createdBy: InvoiceCreatedBy;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
  payments: Payment[];
}

export interface ListInvoicesParams {
  page?: number;
  pageSize?: number;
  patientId?: string;
  status?: PaymentStatus;
  fromDate?: string;
  toDate?: string;
  sortBy?: "createdAt" | "totalAmount";
  sortOrder?: "asc" | "desc";
}

export interface InvoiceItemPayload {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoicePayload {
  patientId: string;
  appointmentId?: string;
  items: InvoiceItemPayload[];
  discount?: number;
  tax?: number;
}

export interface RecordPaymentPayload {
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface RevenueSummaryParams {
  fromDate: string;
  toDate: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalInvoiced: number;
  totalOutstanding: number;
  paymentCount: number;
  invoiceCount: number;
}

export interface SuggestedInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}
