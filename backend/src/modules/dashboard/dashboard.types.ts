import { z } from 'zod';

// `month` is accepted for API-shape forward-compatibility (e.g. future month-anchored
// reporting), but trend endpoints currently always use a rolling 30-day window ending
// today, per product decision. It is parsed/validated here but intentionally unused
// in dashboard.service.ts for now.
export const dashboardQuerySchema = z.object({
  month: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid month')
    .optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
