import { z } from "zod";

export const reportFiltersSchema = z
  .object({
    fromDate: z.string().min(1, "From date is required"),
    toDate: z.string().min(1, "To date is required"),
    doctorId: z.string().optional(),
    patientId: z.string().optional(),
    status: z.string().optional(),
  })
  .refine((data) => new Date(data.toDate).getTime() >= new Date(data.fromDate).getTime(), {
    message: "To date must be on or after from date",
    path: ["toDate"],
  });

export type ReportFiltersFormValues = z.infer<typeof reportFiltersSchema>;
