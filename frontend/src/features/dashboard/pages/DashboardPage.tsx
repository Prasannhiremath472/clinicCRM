import {
  CalendarClock,
  CalendarDays,
  IndianRupee,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentTrendChart } from "@/features/dashboard/components/AppointmentTrendChart";
import { PatientGrowthChart } from "@/features/dashboard/components/PatientGrowthChart";
import { RecentActivityFeed } from "@/features/dashboard/components/RecentActivityFeed";
import { RevenueTrendChart } from "@/features/dashboard/components/RevenueTrendChart";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { useDashboardSummary, useDashboardTrends } from "@/features/dashboard/useDashboard";
import { FollowUpDashboardWidget } from "@/features/followups/components/FollowUpDashboardWidget";
import { useAuthStore } from "@/store/auth.store";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const summary = useDashboardSummary();
  const trends = useDashboardTrends();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting()}, {user?.firstName ?? "there"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Today&apos;s Overview
        </h2>

        {summary.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : summary.isError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load dashboard stats.</p>
              <Button variant="outline" size="sm" onClick={() => summary.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={CalendarDays}
              label="Today's Appointments"
              value={summary.data?.todayAppointments ?? 0}
              iconBg="bg-blue-100 dark:bg-blue-900/30"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={Users}
              label="Total Patients"
              value={summary.data?.totalPatients ?? 0}
              iconBg="bg-violet-100 dark:bg-violet-900/30"
              iconColor="text-violet-600 dark:text-violet-400"
            />
            <StatCard
              icon={UserPlus}
              label="New Patients This Month"
              value={summary.data?.newPatientsThisMonth ?? 0}
              iconBg="bg-cyan-100 dark:bg-cyan-900/30"
              iconColor="text-cyan-600 dark:text-cyan-400"
            />
            <StatCard
              icon={IndianRupee}
              label="Today's Revenue"
              value={formatCurrency(summary.data?.todayRevenue ?? 0)}
              iconBg="bg-emerald-100 dark:bg-emerald-900/30"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={Wallet}
              label="Pending Payments"
              value={formatCurrency(summary.data?.pendingPayments ?? 0)}
              iconBg="bg-amber-100 dark:bg-amber-900/30"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={CalendarClock}
              label="Follow-ups Due"
              value={summary.data?.followUpsDue ?? 0}
              iconBg="bg-rose-100 dark:bg-rose-900/30"
              iconColor="text-rose-500 dark:text-rose-400"
            />
          </div>
        )}
      </section>

      {/* Charts */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Trends &amp; Analytics
        </h2>

        {trends.isError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Could not load trend data.</p>
              <Button variant="outline" size="sm" onClick={() => trends.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AppointmentTrendChart
              data={trends.data?.appointmentTrend}
              isLoading={trends.isLoading}
            />
            <RevenueTrendChart data={trends.data?.revenueTrend} isLoading={trends.isLoading} />
            <PatientGrowthChart
              data={trends.data?.patientGrowthTrend}
              isLoading={trends.isLoading}
            />
          </div>
        )}
      </section>

      {/* Follow-ups & activity */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Follow-ups &amp; Recent Activity
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FollowUpDashboardWidget />
          <RecentActivityFeed />
        </div>
      </section>
    </div>
  );
}
