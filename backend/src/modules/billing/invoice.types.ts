import { PaymentStatus } from '@prisma/client';
import { z } from 'zod';

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().int().positive().optional().default(1),
  unitPrice: z.coerce.number().nonnegative('Unit price cannot be negative'),
});

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  appointmentId: z.string().uuid('Invalid appointment id').optional(),
  items: z.array(invoiceItemSchema).min(1, 'An invoice must include at least one item'),
  discount: z.coerce.number().nonnegative('Discount cannot be negative').optional().default(0),
  tax: z.coerce.number().nonnegative('Tax cannot be negative').optional().default(0),
});

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  patientId: z.string().uuid('Invalid patient id').optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  fromDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid fromDate')
    .optional(),
  toDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid toDate')
    .optional(),
  sortBy: z.enum(['createdAt', 'totalAmount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const revenueSummaryQuerySchema = z
  .object({
    fromDate: z
      .string()
      .min(1, 'fromDate is required')
      .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid fromDate'),
    toDate: z
      .string()
      .min(1, 'toDate is required')
      .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid toDate'),
  })
  .refine((data) => new Date(data.toDate).getTime() >= new Date(data.fromDate).getTime(), {
    message: 'toDate must be on or after fromDate',
    path: ['toDate'],
  });

export const suggestItemsQuerySchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment id'),
});

export const invoiceIdParamsSchema = z.object({
  id: z.string().uuid('Invalid invoice id'),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type RevenueSummaryQuery = z.infer<typeof revenueSummaryQuerySchema>;
export type SuggestItemsQuery = z.infer<typeof suggestItemsQuerySchema>;
export type InvoiceIdParams = z.infer<typeof invoiceIdParamsSchema>;
