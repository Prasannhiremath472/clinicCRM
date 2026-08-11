import type { FollowUp } from "@/features/followups/followups.types";

export interface DashboardSummary {
  todayAppointments: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  todayRevenue: number;
  pendingPayments: number;
  followUpsDue: number;
  upcomingFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface RevenueTrendPoint {
  date: string;
  amount: number;
}

export interface PatientGrowthPoint {
  date: string;
  count: number;
  cumulative: number;
}

export interface DashboardTrends {
  appointmentTrend: TrendPoint[];
  revenueTrend: RevenueTrendPoint[];
  patientGrowthTrend: PatientGrowthPoint[];
}

export type RecentActivityType = "PATIENT" | "APPOINTMENT" | "PAYMENT";

export interface RecentActivityItem {
  type: RecentActivityType;
  id: string;
  description: string;
  timestamp: string;
}
