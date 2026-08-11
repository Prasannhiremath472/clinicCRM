import { FollowUpStatus } from '@prisma/client';
import { z } from 'zod';

function isPastDate(value: string): boolean {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate.getTime() < today.getTime();
}

export const createFollowUpSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  appointmentId: z.string().uuid('Invalid appointment id').optional(),
  followUpDate: z
    .string()
    .min(1, 'Follow-up date is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid follow-up date')
    .refine((value) => !isPastDate(value), 'Follow-up date cannot be in the past'),
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must be at most 1000 characters'),
});

export const updateFollowUpSchema = z
  .object({
    followUpDate: z
      .string()
      .min(1, 'Follow-up date is required')
      .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid follow-up date')
      .refine((value) => !isPastDate(value), 'Follow-up date cannot be in the past'),
    reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must be at most 1000 characters'),
  })
  .partial();

export const updateStatusSchema = z.object({
  status: z.nativeEnum(FollowUpStatus, { errorMap: () => ({ message: 'Invalid follow-up status' }) }),
});

export const listFollowUpsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  patientId: z.string().uuid('Invalid patient id').optional(),
  status: z.nativeEnum(FollowUpStatus).optional(),
  fromDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid fromDate')
    .optional(),
  toDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid toDate')
    .optional(),
  sortBy: z.enum(['followUpDate', 'createdAt']).optional().default('followUpDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const followUpIdParamsSchema = z.object({
  id: z.string().uuid('Invalid follow-up id'),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListFollowUpsQuery = z.infer<typeof listFollowUpsQuerySchema>;
export type FollowUpIdParams = z.infer<typeof followUpIdParamsSchema>;
