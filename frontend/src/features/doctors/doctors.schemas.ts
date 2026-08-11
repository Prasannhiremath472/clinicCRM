import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const WEEK_DAY_VALUES = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const weekDayOptions = WEEK_DAY_VALUES;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const createDoctorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  password: passwordSchema,
  qualification: z.string().min(1, "Qualification is required"),
  specialization: z.string().min(1, "Specialization is required"),
  experienceYears: z.coerce.number().int().nonnegative("Experience years cannot be negative"),
  consultationFee: z.coerce
    .number()
    .positive("Consultation fee must be positive")
    .refine(
      (value) => Number.isInteger(Math.round(value * 100)),
      "Consultation fee can have at most 2 decimal places"
    ),
});
export type CreateDoctorFormValues = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = z.object({
  qualification: z.string().min(1, "Qualification is required"),
  specialization: z.string().min(1, "Specialization is required"),
  experienceYears: z.coerce.number().int().nonnegative("Experience years cannot be negative"),
  consultationFee: z.coerce
    .number()
    .positive("Consultation fee must be positive")
    .refine(
      (value) => Number.isInteger(Math.round(value * 100)),
      "Consultation fee can have at most 2 decimal places"
    ),
  isActive: z.boolean(),
});
export type UpdateDoctorFormValues = z.infer<typeof updateDoctorSchema>;

const scheduleEntrySchema = z
  .object({
    weekDay: z.enum(WEEK_DAY_VALUES),
    startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format"),
    endTime: z.string().regex(timeRegex, "End time must be in HH:MM format"),
    slotDurationMinutes: z.coerce.number().int().positive("Slot duration must be positive"),
    isActive: z.boolean(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const upsertScheduleSchema = z.object({
  schedules: z.array(scheduleEntrySchema),
});
export type UpsertScheduleFormValues = z.infer<typeof upsertScheduleSchema>;

export const createLeaveSchema = z.object({
  date: z
    .string()
    .min(1, "Date is required")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date"),
  reason: z.string().optional().or(z.literal("")),
});
export type CreateLeaveFormValues = z.infer<typeof createLeaveSchema>;
