import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPOINTMENT_STATUS_BADGE_VARIANT,
  APPOINTMENT_STATUS_LABELS,
} from "@/features/appointments/appointments.constants";
import { AppointmentFormDialog } from "@/features/appointments/components/AppointmentFormDialog";
import type { Appointment } from "@/features/appointments/appointments.types";
import { useAppointmentsList, useAvailability } from "@/features/appointments/useAppointments";
import { useDoctorsList } from "@/features/doctors/useDoctors";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";

const ALL_VALUE = "__all__";

function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AppointmentCalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = React.useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [doctorId, setDoctorId] = React.useState<string | undefined>(undefined);
  const [bookSlot, setBookSlot] = React.useState<{ date: string; startTime: string } | null>(null);

  const { data: doctorsResult } = useDoctorsList({ pageSize: 100, isActive: true });
  const doctors = doctorsResult?.items ?? [];

  function goToToday() {
    setCurrentDate(new Date());
  }

  function navigatePeriod(direction: 1 | -1) {
    setCurrentDate((prev) => {
      if (view === "day") return addDays(prev, direction);
      if (view === "week") return addDays(prev, direction * 7);
      return new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointment Calendar</h1>
          <p className="text-sm text-muted-foreground">View and book appointments by day, week, or month</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/appointments")}>
            List view
          </Button>
          <Button onClick={() => navigate("/appointments/new")}>
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigatePeriod(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigatePeriod(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-sm font-medium">
              {view === "month"
                ? currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
                : currentDate.toLocaleDateString(undefined, {
                    weekday: view === "day" ? "long" : undefined,
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={doctorId ?? ALL_VALUE}
              onValueChange={(value) => setDoctorId(value === ALL_VALUE ? undefined : value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All doctors</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    Dr. {doctor.user.firstName} {doctor.user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex rounded-md border">
              {(["day", "week", "month"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium capitalize transition-colors first:rounded-l-md last:rounded-r-md",
                    view === mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {view === "day" ? (
            <DayView
              date={currentDate}
              doctorId={doctorId}
              onBookSlot={(date, startTime) => setBookSlot({ date, startTime })}
              onViewAppointment={(id) => navigate(`/appointments/${id}`)}
            />
          ) : view === "week" ? (
            <WeekView
              date={currentDate}
              doctorId={doctorId}
              onSelectDay={(date) => {
                setCurrentDate(date);
                setView("day");
              }}
              onViewAppointment={(id) => navigate(`/appointments/${id}`)}
            />
          ) : (
            <MonthView
              date={currentDate}
              doctorId={doctorId}
              onSelectDay={(date) => {
                setCurrentDate(date);
                setView("day");
              }}
            />
          )}
        </CardContent>
      </Card>

      {bookSlot ? (
        <AppointmentFormDialog
          mode="create"
          open
          onOpenChange={(open) => !open && setBookSlot(null)}
          defaultDoctorId={doctorId}
          defaultDate={bookSlot.date}
          defaultStartTime={bookSlot.startTime}
        />
      ) : null}
    </div>
  );
}

function DayView({
  date,
  doctorId,
  onBookSlot,
  onViewAppointment,
}: {
  date: Date;
  doctorId: string | undefined;
  onBookSlot: (date: string, startTime: string) => void;
  onViewAppointment: (id: string) => void;
}) {
  const dateStr = toDateOnlyString(date);

  const { data: appointmentsResult, isLoading: isLoadingAppointments } = useAppointmentsList({
    date: dateStr,
    doctorId,
    pageSize: 100,
  });
  const { data: availability, isLoading: isLoadingAvailability } = useAvailability({
    doctorId,
    date: dateStr,
  });

  const appointments = appointmentsResult?.items ?? [];

  if (!doctorId) {
    return (
      <div className="space-y-2 py-8 text-center text-sm text-muted-foreground">
        {isLoadingAppointments ? (
          <Skeleton className="mx-auto h-40 w-full max-w-md" />
        ) : appointments.length === 0 ? (
          <p>Select a doctor above to see and book individual time slots, or view all appointments below.</p>
        ) : null}
        <div className="mt-4 space-y-2 text-left">
          {appointments.map((appt) => (
            <AppointmentRow key={appt.id} appointment={appt} onClick={() => onViewAppointment(appt.id)} />
          ))}
        </div>
      </div>
    );
  }

  if (isLoadingAppointments || isLoadingAvailability) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const bookedByStart = new Map(appointments.map((appt) => [appt.startTime, appt]));
  const freeSlotsSet = new Set((availability?.slots ?? []).map((s) => s.startTime));

  const allTimes = Array.from(new Set([...bookedByStart.keys(), ...freeSlotsSet])).sort();

  if (allTimes.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        This doctor has no schedule or availability configured for this day.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {allTimes.map((time) => {
        const appointment = bookedByStart.get(time);
        const isFree = freeSlotsSet.has(time);

        return (
          <div key={time} className="grid grid-cols-[80px_1fr] items-stretch gap-3 border-b py-2 last:border-0">
            <div className="text-sm font-medium text-muted-foreground">{time}</div>
            {appointment ? (
              <AppointmentRow appointment={appointment} onClick={() => onViewAppointment(appointment.id)} />
            ) : isFree ? (
              <button
                type="button"
                onClick={() => onBookSlot(dateStr, time)}
                className="rounded-md border border-dashed px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                + Book this slot
              </button>
            ) : (
              <div className="rounded-md px-3 py-2 text-sm text-muted-foreground/50">Unavailable</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AppointmentRow({ appointment, onClick }: { appointment: Appointment; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-accent"
    >
      <div>
        <p className="font-medium">
          {appointment.patient.firstName} {appointment.patient.lastName}
        </p>
        <p className="text-xs text-muted-foreground">
          Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName} &middot;{" "}
          {appointment.startTime}-{appointment.endTime}
        </p>
      </div>
      <Badge variant={APPOINTMENT_STATUS_BADGE_VARIANT[appointment.status]}>
        {APPOINTMENT_STATUS_LABELS[appointment.status]}
      </Badge>
    </button>
  );
}

function WeekView({
  date,
  doctorId,
  onSelectDay,
  onViewAppointment,
}: {
  date: Date;
  doctorId: string | undefined;
  onSelectDay: (date: Date) => void;
  onViewAppointment: (id: string) => void;
}) {
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 6);

  const { data: appointmentsResult, isLoading } = useAppointmentsList({
    fromDate: toDateOnlyString(weekStart),
    toDate: toDateOnlyString(weekEnd),
    doctorId,
    pageSize: 200,
  });

  const appointments = appointmentsResult?.items ?? [];
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dayStr = toDateOnlyString(day);
        const dayAppointments = appointments
          .filter((appt) => appt.appointmentDate.slice(0, 10) === dayStr)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const isToday = toDateOnlyString(new Date()) === dayStr;

        return (
          <div key={dayStr} className="flex min-h-[280px] flex-col rounded-md border">
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex items-center justify-between border-b px-2 py-1.5 text-left text-xs font-medium hover:bg-accent",
                isToday && "bg-primary/10",
              )}
            >
              <span>
                {WEEKDAY_LABELS[day.getDay()]} {day.getDate()}
              </span>
              {dayAppointments.length > 0 ? (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {dayAppointments.length}
                </Badge>
              ) : null}
            </button>
            <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
              {dayAppointments.map((appt) => (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => onViewAppointment(appt.id)}
                  className="w-full truncate rounded-sm bg-accent px-1.5 py-1 text-left text-[11px] hover:bg-accent/70"
                  title={`${appt.startTime} ${appt.patient.firstName} ${appt.patient.lastName}`}
                >
                  <span className="font-medium">{appt.startTime}</span> {appt.patient.firstName}{" "}
                  {appt.patient.lastName}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  date,
  doctorId,
  onSelectDay,
}: {
  date: Date;
  doctorId: string | undefined;
  onSelectDay: (date: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(startOfWeek(monthEnd), 6);

  const { data: appointmentsResult, isLoading } = useAppointmentsList({
    fromDate: toDateOnlyString(gridStart),
    toDate: toDateOnlyString(gridEnd),
    doctorId,
    pageSize: 500,
  });

  const appointments = appointmentsResult?.items ?? [];

  const countsByDate = new Map<string, number>();
  for (const appt of appointments) {
    const key = appt.appointmentDate.slice(0, 10);
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayStr = toDateOnlyString(day);
          const count = countsByDate.get(dayStr) ?? 0;
          const isCurrentMonth = day.getMonth() === date.getMonth();
          const isToday = toDateOnlyString(new Date()) === dayStr;

          return (
            <button
              key={dayStr}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-h-[72px] flex-col items-start gap-1 rounded-md border p-1.5 text-left text-xs transition-colors hover:bg-accent",
                !isCurrentMonth && "text-muted-foreground/50",
                isToday && "border-primary",
              )}
            >
              <span className="font-medium">{day.getDate()}</span>
              {count > 0 ? (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {count} appt{count > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
