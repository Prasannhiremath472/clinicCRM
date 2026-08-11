import { useNavigate } from "react-router-dom";
import { CalendarClock, CalendarDays, IndianRupee, Stethoscope, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth.store";

interface ReportCardConfig {
  title: string;
  description: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  staffOnly?: boolean;
}

const REPORT_CARDS: ReportCardConfig[] = [
  {
    title: "Appointment Report",
    description: "View appointments scheduled, completed, and cancelled over a date range.",
    to: "/reports/appointments",
    icon: CalendarDays,
  },
  {
    title: "Revenue Report",
    description: "Track payments collected and revenue trends for your clinic.",
    to: "/reports/revenue",
    icon: IndianRupee,
    staffOnly: true,
  },
  {
    title: "Patient Report",
    description: "See newly registered patients and overall patient counts.",
    to: "/reports/patients",
    icon: Users,
  },
  {
    title: "Doctor Performance Report",
    description: "Compare appointments, consultations, and revenue generated per doctor.",
    to: "/reports/doctor-performance",
    icon: Stethoscope,
    staffOnly: true,
  },
  {
    title: "Follow-up Report",
    description: "Review follow-ups scheduled, completed, and overdue.",
    to: "/reports/follow-ups",
    icon: CalendarClock,
  },
];

export function ReportsHomePage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const isDoctor = role === "DOCTOR";

  const cards = REPORT_CARDS.filter((card) => !(isDoctor && card.staffOnly));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate and export reports across appointments, billing, patients, and follow-ups
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.to}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => navigate(card.to)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{card.title}</CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
