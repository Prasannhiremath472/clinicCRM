import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isPastDate(value: string): boolean {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate.getTime() < today.getTime();
}

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  doctorId: z.string().uuid('Invalid doctor id'),
  appointmentDate: z
    .string()
    .min(1, 'Appointment date is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid appointment date')
    .refine((value) => !isPastDate(value), 'Appointment date cannot be in the past'),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:MM format'),
  type: z.nativeEnum(AppointmentType, { errorMap: () => ({ message: 'Invalid appointment type' }) })
    .optional()
    .default(AppointmentType.WALK_IN),
  notes: z.string().optional(),
});

export const rescheduleAppointmentSchema = z.object({
  appointmentDate: z
    .string()
    .min(1, 'Appointment date is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid appointment date')
    .refine((value) => !isPastDate(value), 'Appointment date cannot be in the past'),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:MM format'),
});

export const cancelAppointmentSchema = z.object({
  cancelReason: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus, { errorMap: () => ({ message: 'Invalid appointment status' }) }),
});

export const listAppointmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
    date: z
      .string()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date')
      .optional(),
    fromDate: z
      .string()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid fromDate')
      .optional(),
    toDate: z
      .string()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid toDate')
      .optional(),
    doctorId: z.string().uuid('Invalid doctor id').optional(),
    patientId: z.string().uuid('Invalid patient id').optional(),
    status: z.nativeEnum(AppointmentStatus).optional(),
    type: z.nativeEnum(AppointmentType).optional(),
    sortBy: z.enum(['appointmentDate', 'createdAt']).optional().default('appointmentDate'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .transform((data) => {
    if (data.date && !data.fromDate && !data.toDate) {
      return { ...data, fromDate: data.date, toDate: data.date };
    }
    return data;
  });

export const checkAvailabilityQuerySchema = z.object({
  doctorId: z.string().uuid('Invalid doctor id'),
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date'),
});

export const appointmentIdParamsSchema = z.object({
  id: z.string().uuid('Invalid appointment id'),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
export type CheckAvailabilityQuery = z.infer<typeof checkAvailabilityQuerySchema>;
export type AppointmentIdParams = z.infer<typeof appointmentIdParamsSchema>;
