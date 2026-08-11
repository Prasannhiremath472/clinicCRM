import { z } from "zod";

const mobileRegex = /^\+?\d{7,15}$/;

const GENDER_VALUES = ["MALE", "FEMALE", "OTHER"] as const;

const BLOOD_GROUP_VALUES = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
  "UNKNOWN",
] as const;

const MARITAL_STATUS_VALUES = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"] as const;

export const genderOptions = GENDER_VALUES;
export const bloodGroupOptions = BLOOD_GROUP_VALUES;
export const maritalStatusOptions = MARITAL_STATUS_VALUES;

const basePatientObjectSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(GENDER_VALUES, { errorMap: () => ({ message: "Gender is required" }) }),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date of birth")
    .refine((value) => new Date(value).getTime() <= Date.now(), "Date of birth cannot be in the future"),
  mobileNumber: z.string().regex(mobileRegex, "Enter a valid mobile number (7-15 digits, optional +)"),
  alternateMobile: z
    .string()
    .regex(mobileRegex, "Enter a valid mobile number (7-15 digits, optional +)")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  bloodGroup: z.enum(BLOOD_GROUP_VALUES).optional(),
  maritalStatus: z.enum(MARITAL_STATUS_VALUES).optional(),

  country: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),

  allergies: z.string().optional().or(z.literal("")),
  existingDiseases: z.string().optional().or(z.literal("")),
  currentMedications: z.string().optional().or(z.literal("")),
  medicalHistory: z.string().optional().or(z.literal("")),

  emergencyContactName: z.string().optional().or(z.literal("")),
  emergencyContactRelation: z.string().optional().or(z.literal("")),
  emergencyContactMobile: z.string().optional().or(z.literal("")),
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
    (value) => value !== undefined && value !== null && value !== ""
  );

  if (provided.length > 0 && provided.length < 3) {
    if (!emergencyContactName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Emergency contact name is required when providing emergency contact details",
        path: ["emergencyContactName"],
      });
    }
    if (!emergencyContactRelation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Emergency contact relation is required when providing emergency contact details",
        path: ["emergencyContactRelation"],
      });
    }
    if (!emergencyContactMobile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Emergency contact mobile is required when providing emergency contact details",
        path: ["emergencyContactMobile"],
      });
    }
  }
}

export const createPatientSchema = basePatientObjectSchema.superRefine(refineEmergencyContact);
export type CreatePatientFormValues = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = basePatientObjectSchema.partial().superRefine(refineEmergencyContact);
export type UpdatePatientFormValues = z.infer<typeof updatePatientSchema>;

export const uploadDocumentSchema = z.object({
  type: z.enum(["LAB_REPORT", "SCAN", "PRESCRIPTION_UPLOAD", "ID_PROOF", "INSURANCE", "OTHER"]),
});
export type UploadDocumentFormValues = z.infer<typeof uploadDocumentSchema>;
