import { FollowUpWithComputed, followUpService } from '../followups/followup.service';
import { dashboardRepository, RecentActivityItem } from './dashboard.repository';
import { DashboardQuery } from './dashboard.types';

const RECENT_ACTIVITY_LIMIT = 15;
const DASHBOARD_FOLLOWUP_LIMIT = 5;
const TREND_WINDOW_DAYS = 30;

export interface DashboardSummary {
  todayAppointments: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  todayRevenue: number;
  pendingPayments: number;
  followUpsDue: number;
  upcomingFollowUps: FollowUpWithComputed[];
  overdueFollowUps: FollowUpWithComputed[];
}

export interface DashboardTrends {
  appointmentTrend: { date: string; count: number }[];
  revenueTrend: { date: string; amount: number }[];
  patientGrowthTrend: { date: string; count: number; cumulative: number }[];
}

async function getDashboardSummary(clinicId: string): Promise<DashboardSummary> {
  const [
    todayAppointments,
    totalPatients,
    newPatientsThisMonth,
    todayRevenue,
    pendingPayments,
    followUps,
  ] = await Promise.all([
    dashboardRepository.countTodayAppointments(clinicId),
    dashboardRepository.countTotalPatients(clinicId),
    dashboardRepository.countNewPatientsThisMonth(clinicId),
    dashboardRepository.getTodayRevenue(clinicId),
    dashboardRepository.getPendingPaymentsTotal(clinicId),
    followUpService.getDashboardSummary(clinicId),
  ]);

  return {
    todayAppointments,
    totalPatients,
    newPatientsThisMonth,
    todayRevenue,
    pendingPayments,
    followUpsDue: followUps.upcoming.length + followUps.overdue.length,
    upcomingFollowUps: followUps.upcoming.slice(0, DASHBOARD_FOLLOWUP_LIMIT),
    overdueFollowUps: followUps.overdue.slice(0, DASHBOARD_FOLLOWUP_LIMIT),
  };
}

// `query.month` is accepted for forward-compatibility but is currently unused: trends
// always use a rolling 30-day window ending today, per product decision.
async function getTrends(clinicId: string, _query: DashboardQuery): Promise<DashboardTrends> {
  const toDate = new Date();
  toDate.setHours(23, 59, 59, 999);

  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - (TREND_WINDOW_DAYS - 1));
  fromDate.setHours(0, 0, 0, 0);

  const [appointmentTrend, revenueTrend, patientGrowthTrend] = await Promise.all([
    dashboardRepository.getAppointmentTrend(clinicId, fromDate, toDate),
    dashboardRepository.getRevenueTrend(clinicId, fromDate, toDate),
    dashboardRepository.getPatientGrowthTrend(clinicId, fromDate, toDate),
  ]);

  return { appointmentTrend, revenueTrend, patientGrowthTrend };
}

function getRecentActivity(clinicId: string): Promise<RecentActivityItem[]> {
  return dashboardRepository.getRecentActivity(clinicId, RECENT_ACTIVITY_LIMIT);
}

export const dashboardService = {
  getDashboardSummary,
  getTrends,
  getRecentActivity,
};
