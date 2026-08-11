import { z } from 'zod';

const bloodPressureRegex = /^\d{2,3}\/\d{2,3}$/;

export const updateConsultationSchema = z.object({
  heightCm: z.coerce.number().min(30, 'Height must be at least 30 cm').max(300, 'Height must be at most 300 cm').optional(),
  weightKg: z.coerce.number().min(1, 'Weight must be at least 1 kg').max(500, 'Weight must be at most 500 kg').optional(),
  bloodPressure: z
    .string()
    .regex(bloodPressureRegex, 'Blood pressure must be in the format "120/80"')
    .optional(),
  temperatureF: z.coerce
    .number()
    .min(90, 'Temperature must be at least 90°F')
    .max(110, 'Temperature must be at most 110°F')
    .optional(),
  pulseRate: z.coerce
    .number()
    .int('Pulse rate must be an integer')
    .min(20, 'Pulse rate must be at least 20')
    .max(250, 'Pulse rate must be at most 250')
    .optional(),
  oxygenSaturation: z.coerce
    .number()
    .int('Oxygen saturation must be an integer')
    .min(0, 'Oxygen saturation must be at least 0')
    .max(100, 'Oxygen saturation must be at most 100')
    .optional(),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  clinicalNotes: z.string().optional(),
  recommendedTests: z.string().optional(),
  treatmentPlan: z.string().optional(),
});

export const listConsultationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  patientId: z.string().uuid('Invalid patient id').optional(),
  doctorId: z.string().uuid('Invalid doctor id').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const consultationIdParamsSchema = z.object({
  id: z.string().uuid('Invalid consultation id'),
});

export const appointmentIdParamsSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment id'),
});

export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
export type ListConsultationsQuery = z.infer<typeof listConsultationsQuerySchema>;
export type ConsultationIdParams = z.infer<typeof consultationIdParamsSchema>;
export type AppointmentIdParams = z.infer<typeof appointmentIdParamsSchema>;
