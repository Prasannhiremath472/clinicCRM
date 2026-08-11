import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative"),
});
export type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>;

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid("Select a patient"),
  appointmentId: z.string().optional().or(z.literal("")),
  items: z.array(invoiceItemSchema).min(1, "Add at least one item"),
  discount: z.coerce.number().nonnegative("Discount cannot be negative").optional().default(0),
  tax: z.coerce.number().nonnegative("Tax cannot be negative").optional().default(0),
});
export type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export const EMPTY_INVOICE_ITEM: InvoiceItemFormValues = {
  description: "",
  quantity: 1,
  unitPrice: 0,
};

const PAYMENT_METHOD_VALUES = ["CASH", "UPI", "CARD", "BANK_TRANSFER"] as const;
export const paymentMethodOptions = PAYMENT_METHOD_VALUES;

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  method: z.enum(PAYMENT_METHOD_VALUES),
  referenceNumber: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});
export type RecordPaymentFormValues = z.infer<typeof recordPaymentSchema>;
