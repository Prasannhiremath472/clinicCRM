import { z } from 'zod';

export const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  instructions: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const savePrescriptionSchema = z.object({
  notes: z.string().optional(),
  items: z
    .array(prescriptionItemSchema)
    .min(1, 'A prescription must include at least one medicine'),
});

export const listPrescriptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  patientId: z.string().uuid('Invalid patient id').optional(),
  doctorId: z.string().uuid('Invalid doctor id').optional(),
  sortBy: z.enum(['issuedDate', 'createdAt', 'updatedAt']).optional().default('issuedDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const prescriptionIdParamsSchema = z.object({
  id: z.string().uuid('Invalid prescription id'),
});

export const consultationIdParamsSchema = z.object({
  consultationId: z.string().uuid('Invalid consultation id'),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
export type SavePrescriptionInput = z.infer<typeof savePrescriptionSchema>;
export type ListPrescriptionsQuery = z.infer<typeof listPrescriptionsQuerySchema>;
export type PrescriptionIdParams = z.infer<typeof prescriptionIdParamsSchema>;
export type ConsultationIdParams = z.infer<typeof consultationIdParamsSchema>;
