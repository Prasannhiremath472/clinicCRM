import { z } from "zod";

const bloodPressureRegex = /^\d{2,3}\/\d{2,3}$/;

function optionalNumber(schema: z.ZodNumber) {
  return z
    .union([z.literal(""), z.coerce.number()])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value))
    .pipe(schema.optional());
}

export const vitalsSchema = z.object({
  heightCm: optionalNumber(z.number().min(30, "Height must be at least 30 cm").max(300, "Height must be at most 300 cm")),
  weightKg: optionalNumber(z.number().min(1, "Weight must be at least 1 kg").max(500, "Weight must be at most 500 kg")),
  bloodPressure: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || bloodPressureRegex.test(value), 'Use the format "120/80"'),
  temperatureF: optionalNumber(z.number().min(90, "Temperature must be at least 90°F").max(110, "Temperature must be at most 110°F")),
  pulseRate: optionalNumber(z.number().int("Pulse rate must be a whole number").min(20, "Pulse rate must be at least 20").max(250, "Pulse rate must be at most 250")),
  oxygenSaturation: optionalNumber(z.number().int("Oxygen saturation must be a whole number").min(0, "Oxygen saturation must be at least 0").max(100, "Oxygen saturation must be at most 100")),
});
export type VitalsFormValues = z.infer<typeof vitalsSchema>;

export const consultationNotesSchema = z.object({
  symptoms: z.string().optional().or(z.literal("")),
  diagnosis: z.string().optional().or(z.literal("")),
  clinicalNotes: z.string().optional().or(z.literal("")),
  recommendedTests: z.string().optional().or(z.literal("")),
  treatmentPlan: z.string().optional().or(z.literal("")),
});
export type ConsultationNotesFormValues = z.infer<typeof consultationNotesSchema>;

export const consultationFormSchema = vitalsSchema.merge(consultationNotesSchema);
export type ConsultationFormValues = z.infer<typeof consultationFormSchema>;
