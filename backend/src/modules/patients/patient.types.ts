import { BloodGroup, Gender, MaritalStatus } from '@prisma/client';
import { z } from 'zod';

const mobileRegex = /^\+?\d{7,15}$/;

const baseObjectSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.nativeEnum(Gender, { errorMap: () => ({ message: 'Invalid gender' }) }),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date of birth')
    .refine((value) => new Date(value).getTime() <= Date.now(), 'Date of birth cannot be in the future'),
  mobileNumber: z.string().regex(mobileRegex, 'Enter a valid mobile number (7-15 digits, optional +)'),
  alternateMobile: z
    .string()
    .regex(mobileRegex, 'Enter a valid mobile number (7-15 digits, optional +)')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  bloodGroup: z.nativeEnum(BloodGroup).optional().default(BloodGroup.UNKNOWN),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),

  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  address: z.string().optional(),

  allergies: z.string().optional(),
  existingDiseases: z.string().optional(),
  currentMedications: z.string().optional(),
  medicalHistory: z.string().optional(),

  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactMobile: z.string().optional(),
});

function refineEmergencyContact(
  data: {
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactMobile?: string;
  },
  ctx: z.RefinementCtx
) {
  const { emergencyContactName, emergencyContactRelation, emergencyContactMobile } = data;
  const provided = [emergencyContactName, emergencyContactRelation, emergencyContactMobile].filter(
    (value) => value !== undefined && value !== null && value !== ''
  );

  if (provided.length > 0 && provided.length < 3) {
    if (!emergencyContactName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Emergency contact name is required when providing emergency contact details',
        path: ['emergencyContactName'],
      });
    }
    if (!emergencyContactRelation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Emergency contact relation is required when providing emergency contact details',
        path: ['emergencyContactRelation'],
      });
    }
    if (!emergencyContactMobile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Emergency contact mobile is required when providing emergency contact details',
        path: ['emergencyContactMobile'],
      });
    }
  }
}

export const createPatientSchema = baseObjectSchema.superRefine(refineEmergencyContact);

export const updatePatientSchema = baseObjectSchema.partial().superRefine(refineEmergencyContact);

export const listPatientsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().min(1).optional(),
  gender: z.nativeEnum(Gender).optional(),
  bloodGroup: z.nativeEnum(BloodGroup).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'firstName', 'dateOfBirth']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const uploadDocumentBodySchema = z.object({
  type: z.enum(['LAB_REPORT', 'SCAN', 'PRESCRIPTION_UPLOAD', 'ID_PROOF', 'INSURANCE', 'OTHER']),
});

export const patientIdParamsSchema = z.object({
  id: z.string().uuid('Invalid patient id'),
});

export const patientDocumentParamsSchema = z.object({
  id: z.string().uuid('Invalid patient id'),
  documentId: z.string().uuid('Invalid document id'),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
export type UploadDocumentBody = z.infer<typeof uploadDocumentBodySchema>;
export type PatientIdParams = z.infer<typeof patientIdParamsSchema>;
export type PatientDocumentParams = z.infer<typeof patientDocumentParamsSchema>;
