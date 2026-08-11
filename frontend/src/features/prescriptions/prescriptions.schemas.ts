import { z } from "zod";

export const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional().or(z.literal("")),
});
export type PrescriptionItemFormValues = z.infer<typeof prescriptionItemSchema>;

export const savePrescriptionSchema = z.object({
  notes: z.string().optional().or(z.literal("")),
  items: z.array(prescriptionItemSchema).min(1, "Add at least one medicine"),
});
export type SavePrescriptionFormValues = z.infer<typeof savePrescriptionSchema>;

export const EMPTY_PRESCRIPTION_ITEM: PrescriptionItemFormValues = {
  medicineName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};
