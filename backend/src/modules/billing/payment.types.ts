import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  method: z.nativeEnum(PaymentMethod, { errorMap: () => ({ message: 'Invalid payment method' }) }),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentIdParamsSchema = z.object({
  id: z.string().uuid('Invalid payment id'),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type PaymentIdParams = z.infer<typeof paymentIdParamsSchema>;
