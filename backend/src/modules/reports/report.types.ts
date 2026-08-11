import { z } from 'zod';

const reportFiltersBaseSchema = z.object({
  fromDate: z
    .string()
    .min(1, 'fromDate is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid fromDate'),
  toDate: z
    .string()
    .min(1, 'toDate is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid toDate'),
  doctorId: z.string().uuid('Invalid doctor id').optional(),
  patientId: z.string().uuid('Invalid patient id').optional(),
  status: z.string().optional(),
});

function refineDateRange<T extends { fromDate: string; toDate: string }>(data: T, ctx: z.RefinementCtx): void {
  if (new Date(data.toDate).getTime() < new Date(data.fromDate).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'toDate must be on or after fromDate',
      path: ['toDate'],
    });
  }
}

export const reportFiltersSchema = reportFiltersBaseSchema.superRefine(refineDateRange);

export const exportFormatSchema = z.enum(['json', 'pdf', 'excel']).default('json');

export const reportQuerySchema = reportFiltersBaseSchema
  .extend({ format: exportFormatSchema })
  .superRefine(refineDateRange);

export type ReportFilters = z.infer<typeof reportFiltersSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
