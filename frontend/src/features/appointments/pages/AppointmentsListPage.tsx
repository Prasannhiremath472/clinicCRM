import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  APPOINTMENT_STATUS_BADGE_VARIANT,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  getNextLegalStatuses,
} from "@/features/appointments/appointments.constants";
import { AppointmentFormDialog } from "@/features/appointments/components/AppointmentFormDialog";
import { CancelAppointmentDialog } from "@/features/appointments/components/CancelAppointmentDialog";
import type {
  Appointment,
  AppointmentStatus,
  ListAppointmentsParams,
} from "@/features/appointments/appointments.types";
import { useAppointmentsList, useUpdateAppointmentStatus } from "@/features/appointments/useAppointments";
import { useDoctorsList } from "@/features/doctors/useDoctors";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

const ALL_VALUE = "__all__";

function formatDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AppointmentsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fromDate, setFromDate] = React.useState(searchParams.get("date") ?? "");
  const [toDate, setToDate] = React.useState(searchParams.get("date") ?? "");
  const [doctorId, setDoctorId] = React.useState<string | undefined>(undefined);
  const [patientSearch, setPatientSearch] = React.useState("");
  const [status, setStatus] = React.useState<AppointmentStatus | undefined>(undefined);
  const [page, setPage] = React.useState(1);

  const [rescheduleTarget, setRescheduleTarget] = React.useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<Appointment | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const debouncedPatientSearch = useDebouncedValue(patientSearch, 400);

  const { data: doctorsResult } = useDoctorsList({ pageSize: 100, isActive: true });
  const doctors = doctorsResult?.items ?? [];

  const filters: ListAppointmentsParams = {
    page,
    pageSize: 20,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    doctorId,
    status,
    sortBy: "appointmentDate",
    sortOrder: "desc",
  };

  const { data, isLoading, isError, refetch } = useAppointmentsList(filters);
  const updateStatus = useUpdateAppointmentStatus();

  React.useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, doctorId, status]);

  const allItems = data?.items ?? [];
  const items = debouncedPatientSearch
    ? allItems.filter((appt) => {
        const name = `${appt.patient.firstName} ${appt.patient.lastName}`.toLowerCase();
        const query = debouncedPatientSearch.toLowerCase();
        return (
          name.includes(query) ||
          appt.patient.mobileNumber.includes(debouncedPatientSearch) ||
          appt.patient.patientCode.toLowerCase().includes(query)
        );
      })
    : allItems;
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and track appointments across your clinic
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/appointments/calendar")}>
            <CalendarDays className="h-4 w-4" />
            Calendar view
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="shadow-sm">
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4 border-b pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Search & Filter</CardTitle>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, mobile, or code"
                className="pl-8"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>

            <Input
              type="date"
              className="w-[160px]"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <Input
              type="date"
              className="w-[160px]"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />

            <Select
              value={doctorId ?? ALL_VALUE}
              onValueChange={(value) => setDoctorId(value === ALL_VALUE ? undefined : value)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Doctor" />
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

            <Select
              value={status ?? ALL_VALUE}
              onValueChange={(value) =>
                setStatus(value === ALL_VALUE ? undefined : (value as AppointmentStatus))
              }
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
                {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Something went wrong while loading appointments.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No appointments found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try adjusting your search or filters, or book a new appointment.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                New Appointment
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((appointment) => {
                    const nextStatuses = getNextLegalStatuses(appointment.status);
                    return (
                      <TableRow key={appointment.id} className="cursor-pointer">
                        <TableCell
                          className="font-medium"
                          onClick={() => navigate(`/appointments/${appointment.id}`)}
                        >
                          {appointment.appointmentCode}
                        </TableCell>
                        <TableCell onClick={() => navigate(`/appointments/${appointment.id}`)}>
                          {appointment.patient.firstName} {appointment.patient.lastName}
                        </TableCell>
                        <TableCell onClick={() => navigate(`/appointments/${appointment.id}`)}>
                          Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName}
                        </TableCell>
                        <TableCell onClick={() => navigate(`/appointments/${appointment.id}`)}>
                          {formatDate(appointment.appointmentDate)}
                        </TableCell>
                        <TableCell onClick={() => navigate(`/appointments/${appointment.id}`)}>
                          {appointment.startTime} - {appointment.endTime}
                        </TableCell>
                        <TableCell onClick={() => navigate(`/appointments/${appointment.id}`)}>
                          {APPOINTMENT_TYPE_LABELS[appointment.type]}
                        </TableCell>
                        <TableCell onClick={() => navigate(`/appointments/${appointment.id}`)}>
                          <Badge variant={APPOINTMENT_STATUS_BADGE_VARIANT[appointment.status]}>
                            {APPOINTMENT_STATUS_LABELS[appointment.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/appointments/${appointment.id}`)}>
                                View
                              </DropdownMenuItem>
                              {nextStatuses.length > 0 ? (
                                <DropdownMenuItem onClick={() => setRescheduleTarget(appointment)}>
                                  Reschedule
                                </DropdownMenuItem>
                              ) : null}
                              {nextStatuses.length > 0 ? <DropdownMenuSeparator /> : null}
                              {nextStatuses
                                .filter((s) => s !== "CANCELLED")
                                .map((nextStatus) => (
                                  <DropdownMenuItem
                                    key={nextStatus}
                                    onClick={() =>
                                      updateStatus.mutate({ id: appointment.id, payload: { status: nextStatus } })
                                    }
                                  >
                                    Mark as {APPOINTMENT_STATUS_LABELS[nextStatus]}
                                  </DropdownMenuItem>
                                ))}
                              {nextStatuses.includes("CANCELLED") ? (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setCancelTarget(appointment)}
                                >
                                  Cancel
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {meta ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(meta.page - 1) * meta.pageSize + 1}-
                    {Math.min(meta.page * meta.pageSize, meta.totalItems)} of {meta.totalItems}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={meta.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {meta.page} of {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={meta.page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <AppointmentFormDialog mode="create" open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {rescheduleTarget ? (
        <AppointmentFormDialog
          mode="reschedule"
          appointment={rescheduleTarget}
          open
          onOpenChange={(open) => !open && setRescheduleTarget(null)}
        />
      ) : null}

      {cancelTarget ? (
        <CancelAppointmentDialog appointment={cancelTarget} onClose={() => setCancelTarget(null)} />
      ) : null}
    </div>
  );
}
