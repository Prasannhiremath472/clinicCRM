import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  APPOINTMENT_STATUS_BADGE_VARIANT,
  APPOINTMENT_STATUS_LABELS,
} from "@/features/appointments/appointments.constants";
import {
  consultationFormSchema,
  type ConsultationFormValues,
} from "@/features/consultations/consultations.schemas";
import type { Consultation } from "@/features/consultations/consultations.types";
import { useCompleteConsultation, useUpdateConsultation } from "@/features/consultations/useConsultations";
import { useAuthStore } from "@/store/auth.store";

export interface ConsultationWorkspaceProps {
  consultation: Consultation;
  readOnly?: boolean;
}

function toFormValues(consultation: Consultation): ConsultationFormValues {
  return {
    heightCm: consultation.heightCm !== null ? Number(consultation.heightCm) : undefined,
    weightKg: consultation.weightKg !== null ? Number(consultation.weightKg) : undefined,
    bloodPressure: consultation.bloodPressure ?? "",
    temperatureF: consultation.temperatureF !== null ? Number(consultation.temperatureF) : undefined,
    pulseRate: consultation.pulseRate ?? undefined,
    oxygenSaturation: consultation.oxygenSaturation ?? undefined,
    symptoms: consultation.symptoms ?? "",
    diagnosis: consultation.diagnosis ?? "",
    clinicalNotes: consultation.clinicalNotes ?? "",
    recommendedTests: consultation.recommendedTests ?? "",
    treatmentPlan: consultation.treatmentPlan ?? "",
  };
}

function buildPayload(values: ConsultationFormValues) {
  return {
    heightCm: values.heightCm,
    weightKg: values.weightKg,
    bloodPressure: values.bloodPressure || undefined,
    temperatureF: values.temperatureF,
    pulseRate: values.pulseRate,
    oxygenSaturation: values.oxygenSaturation,
    symptoms: values.symptoms || undefined,
    diagnosis: values.diagnosis || undefined,
    clinicalNotes: values.clinicalNotes || undefined,
    recommendedTests: values.recommendedTests || undefined,
    treatmentPlan: values.treatmentPlan || undefined,
  };
}

export function ConsultationWorkspace({ consultation, readOnly = false }: ConsultationWorkspaceProps) {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const [completeOpen, setCompleteOpen] = React.useState(false);

  const isDoctor = role === "DOCTOR";
  const isEditable = !readOnly && isDoctor && consultation.appointment.status === "IN_CONSULTATION";

  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
    values: toFormValues(consultation),
  });

  const updateConsultation = useUpdateConsultation();
  const completeConsultation = useCompleteConsultation();

  function onSubmit(values: ConsultationFormValues) {
    updateConsultation.mutate({ id: consultation.id, payload: buildPayload(values) });
  }

  function handleComplete() {
    completeConsultation.mutate(consultation.id, {
      onSuccess: () => {
        setCompleteOpen(false);
        navigate(`/appointments/${consultation.appointmentId}`);
      },
    });
  }

  if (!readOnly && !isDoctor) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm font-medium">Only doctors can document a consultation.</p>
          <p className="text-sm text-muted-foreground">
            You can view this visit's record, but editing is restricted to the treating doctor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">
              {consultation.patient.firstName} {consultation.patient.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {consultation.patient.patientCode} &middot; {consultation.patient.mobileNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              Dr. {consultation.doctor.user.firstName} {consultation.doctor.user.lastName} &middot;{" "}
              {consultation.doctor.specialization}
            </p>
          </div>
          <Badge variant={APPOINTMENT_STATUS_BADGE_VARIANT[consultation.appointment.status]}>
            {APPOINTMENT_STATUS_LABELS[consultation.appointment.status]}
          </Badge>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vitals</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="heightCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" disabled={!isEditable} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" disabled={!isEditable} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bloodPressure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood pressure</FormLabel>
                    <FormControl>
                      <Input placeholder="120/80" disabled={!isEditable} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temperatureF"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature (°F)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" disabled={!isEditable} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pulseRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pulse rate (bpm)</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={!isEditable} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="oxygenSaturation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SpO2 (%)</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={!isEditable} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consultation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symptoms</FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        disabled={!isEditable}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnosis</FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        disabled={!isEditable}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clinicalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinical notes</FormLabel>
                    <FormControl>
                      <textarea
                        rows={4}
                        disabled={!isEditable}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recommendedTests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recommended tests</FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        disabled={!isEditable}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="treatmentPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Treatment plan</FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        disabled={!isEditable}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {isEditable ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(
                    `/follow-ups/new?patientId=${consultation.patientId}&appointmentId=${consultation.appointmentId}`
                  )
                }
              >
                Schedule Follow-up
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/prescriptions/${consultation.id}`)}
              >
                Prescription
              </Button>
              <Button type="submit" variant="outline" disabled={updateConsultation.isPending}>
                {updateConsultation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button type="button" onClick={() => setCompleteOpen(true)} disabled={completeConsultation.isPending}>
                Complete consultation
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/prescriptions/${consultation.id}`)}
              >
                View prescription
              </Button>
            </div>
          )}
        </form>
      </Form>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete this consultation?</DialogTitle>
            <DialogDescription>
              This will mark the appointment as completed. You won't be able to edit vitals or notes for this
              visit afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={completeConsultation.isPending}>
              Keep editing
            </Button>
            <Button onClick={handleComplete} disabled={completeConsultation.isPending}>
              {completeConsultation.isPending ? "Completing..." : "Complete consultation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
