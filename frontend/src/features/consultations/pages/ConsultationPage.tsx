import { AxiosError } from "axios";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppointment } from "@/features/appointments/useAppointments";
import { ConsultationWorkspace } from "@/features/consultations/components/ConsultationWorkspace";
import { useConsultationByAppointment, useStartConsultation } from "@/features/consultations/useConsultations";
import { useAuthStore } from "@/store/auth.store";
import type { ApiErrorResponse } from "@/types/api.types";

const STARTABLE_STATUSES = ["SCHEDULED", "CONFIRMED", "WAITING"];

export function ConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(appointmentId);
  const {
    data: consultation,
    isLoading: isLoadingConsultation,
    isError,
    error,
  } = useConsultationByAppointment(appointmentId);
  const startConsultation = useStartConsultation();

  const consultationMissing =
    isError && error instanceof AxiosError && error.response?.status === 404;

  if (isLoadingAppointment || (isLoadingConsultation && !consultationMissing)) {
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

  const backButton = (
    <Button variant="ghost" size="icon" onClick={() => navigate(`/appointments/${appointment.id}`)}>
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );

  if (consultation) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          {backButton}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Consultation</h1>
            <p className="text-sm text-muted-foreground">{appointment.appointmentCode}</p>
          </div>
        </div>
        <ConsultationWorkspace consultation={consultation} />
      </div>
    );
  }

  if (isError && !consultationMissing) {
    const message =
      error instanceof AxiosError
        ? (error.response?.data as ApiErrorResponse | undefined)?.message
        : undefined;
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">{message ?? "Could not load this consultation."}</p>
        <Button variant="outline" onClick={() => navigate(`/appointments/${appointment.id}`)}>
          Back to appointment
        </Button>
      </div>
    );
  }

  const canStart = role === "DOCTOR" && STARTABLE_STATUSES.includes(appointment.status);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        {backButton}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultation</h1>
          <p className="text-sm text-muted-foreground">{appointment.appointmentCode}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No consultation has been started for this appointment yet.
          </p>
          {canStart ? (
            <Button
              onClick={() => startConsultation.mutate(appointment.id)}
              disabled={startConsultation.isPending}
            >
              {startConsultation.isPending ? "Starting..." : "Start consultation"}
            </Button>
          ) : role === "DOCTOR" ? (
            <p className="text-sm text-muted-foreground">
              This appointment's status ({appointment.status}) does not allow starting a consultation.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only the treating doctor can start this consultation.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
