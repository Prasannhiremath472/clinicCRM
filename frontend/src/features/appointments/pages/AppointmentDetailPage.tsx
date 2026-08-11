import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPOINTMENT_STATUS_BADGE_VARIANT,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  getNextLegalStatuses,
} from "@/features/appointments/appointments.constants";
import { AppointmentFormDialog } from "@/features/appointments/components/AppointmentFormDialog";
import { CancelAppointmentDialog } from "@/features/appointments/components/CancelAppointmentDialog";
import { useAppointment, useUpdateAppointmentStatus } from "@/features/appointments/useAppointments";
import { useAuthStore } from "@/store/auth.store";

function formatDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading } = useAppointment(id);
  const updateStatus = useUpdateAppointmentStatus();
  const role = useAuthStore((s) => s.user?.role);

  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">Appointment not found.</p>
        <Button variant="outline" onClick={() => navigate("/appointments")}>
          Back to appointments
        </Button>
      </div>
    );
  }

  const nextStatuses = getNextLegalStatuses(appointment.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/appointments")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{appointment.appointmentCode}</h1>
          <p className="text-sm text-muted-foreground">Appointment details</p>
        </div>
        <Badge variant={APPOINTMENT_STATUS_BADGE_VARIANT[appointment.status]}>
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </Badge>
        <div className="ml-auto flex gap-2">
          {role === "CLINIC_ADMIN" || role === "RECEPTIONIST" ? (
            <Button variant="outline" onClick={() => navigate(`/billing/new?appointmentId=${appointment.id}`)}>
              Generate Invoice
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate(`/consultations/${appointment.id}`)}>
            {appointment.status === "IN_CONSULTATION"
              ? role === "DOCTOR"
                ? "Continue Consultation"
                : "View Consultation"
              : appointment.status === "COMPLETED"
                ? "View Consultation"
                : "Start Consultation"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium leading-none">Date</p>
            <p className="mt-2 text-sm text-muted-foreground">{formatDate(appointment.appointmentDate)}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Time</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {appointment.startTime} - {appointment.endTime}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Type</p>
            <p className="mt-2 text-sm text-muted-foreground">{APPOINTMENT_TYPE_LABELS[appointment.type]}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Booked by</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {appointment.createdBy.firstName} {appointment.createdBy.lastName}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patient</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium leading-none">Name</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Patient code</p>
            <p className="mt-2 text-sm text-muted-foreground">{appointment.patient.patientCode}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Mobile</p>
            <p className="mt-2 text-sm text-muted-foreground">{appointment.patient.mobileNumber}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doctor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium leading-none">Name</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Specialization</p>
            <p className="mt-2 text-sm text-muted-foreground">{appointment.doctor.specialization}</p>
          </div>
        </CardContent>
      </Card>

      {appointment.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{appointment.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {appointment.cancelReason ? (
        <Card>
          <CardHeader>
            <CardTitle>Cancellation reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{appointment.cancelReason}</p>
          </CardContent>
        </Card>
      ) : null}

      {nextStatuses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {nextStatuses
                .filter((s) => s !== "CANCELLED")
                .map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    variant="outline"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: appointment.id, payload: { status: nextStatus } })}
                  >
                    Mark as {APPOINTMENT_STATUS_LABELS[nextStatus]}
                  </Button>
                ))}
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
                Reschedule
              </Button>
              {nextStatuses.includes("CANCELLED") ? (
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                  Cancel appointment
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <AppointmentFormDialog
        mode="reschedule"
        appointment={appointment}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
      />

      {cancelOpen ? (
        <CancelAppointmentDialog appointment={appointment} onClose={() => setCancelOpen(false)} />
      ) : null}
    </div>
  );
}
