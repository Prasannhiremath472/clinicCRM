import { WeekDay } from '@prisma/client';
import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createDoctorSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Phone number is required').optional(),
  password: passwordSchema,

  qualification: z.string().min(1, 'Qualification is required'),
  specialization: z.string().min(1, 'Specialization is required'),
  experienceYears: z.coerce.number().int().nonnegative('Experience years cannot be negative'),
  consultationFee: z.coerce
    .number()
    .positive('Consultation fee must be positive')
    .refine(
      (value) => Number.isInteger(Math.round(value * 100)),
      'Consultation fee can have at most 2 decimal places'
    ),
});

export const updateDoctorSchema = z
  .object({
    qualification: z.string().min(1, 'Qualification is required'),
    specialization: z.string().min(1, 'Specialization is required'),
    experienceYears: z.coerce.number().int().nonnegative('Experience years cannot be negative'),
    consultationFee: z.coerce
      .number()
      .positive('Consultation fee must be positive')
      .refine(
        (value) => Number.isInteger(Math.round(value * 100)),
        'Consultation fee can have at most 2 decimal places'
      ),
    isActive: z.boolean(),
  })
  .partial();

export const listDoctorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().min(1).optional(),
  specialization: z.string().trim().min(1).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'firstName', 'experienceYears']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const scheduleEntrySchema = z
  .object({
    weekDay: z.nativeEnum(WeekDay, { errorMap: () => ({ message: 'Invalid week day' }) }),
    startTime: z.string().regex(timeRegex, 'Start time must be in HH:MM format'),
    endTime: z.string().regex(timeRegex, 'End time must be in HH:MM format'),
    slotDurationMinutes: z.coerce.number().int().positive().optional().default(15),
    isActive: z.boolean().optional().default(true),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const upsertScheduleSchema = z.object({
  schedules: z.array(scheduleEntrySchema),
});

export const createLeaveSchema = z.object({
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date')
    .refine((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date.getTime() >= today.getTime();
    }, 'Leave date cannot be in the past'),
  reason: z.string().optional(),
});

export const doctorIdParamsSchema = z.object({
  id: z.string().uuid('Invalid doctor id'),
});

export const doctorLeaveParamsSchema = z.object({
  id: z.string().uuid('Invalid doctor id'),
  leaveId: z.string().uuid('Invalid leave id'),
});

export const availabilityQuerySchema = z.object({
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date'),
});

export const listLeavesQuerySchema = z.object({
  fromDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid fromDate')
    .optional(),
  toDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid toDate')
    .optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
export type UpsertScheduleInput = z.infer<typeof upsertScheduleSchema>;
export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type DoctorIdParams = z.infer<typeof doctorIdParamsSchema>;
export type DoctorLeaveParams = z.infer<typeof doctorLeaveParamsSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type ListLeavesQuery = z.infer<typeof listLeavesQuerySchema>;
