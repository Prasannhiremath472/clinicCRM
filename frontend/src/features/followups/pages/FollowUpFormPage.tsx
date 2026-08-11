import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { CalendarIcon, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FOLLOWUP_STATUS_BADGE_VARIANT,
  FOLLOWUP_STATUS_LABELS,
} from "@/features/followups/followups.constants";
import { createFollowUpSchema, type CreateFollowUpFormValues } from "@/features/followups/followups.schemas";
import { useCreateFollowUp, useFollowUp, useUpdateFollowUp } from "@/features/followups/useFollowUps";
import { useAppointmentsList } from "@/features/appointments/useAppointments";
import { usePatientsList } from "@/features/patients/usePatients";
import type { ApiErrorResponse } from "@/types/api.types";
import { cn } from "@/lib/utils";

const NO_APPOINTMENT_VALUE = "__none__";

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as ApiErrorResponse | undefined)?.message ??
      "Could not save follow-up. Please try again."
    );
  }
  return "Could not save follow-up. Please try again.";
}

function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string): string {
  if (!value) return "Pick a date";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function FollowUpFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = !!id;

  const patientIdFromQuery = searchParams.get("patientId") ?? "";
  const appointmentIdFromQuery = searchParams.get("appointmentId") ?? "";

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [patientSearch, setPatientSearch] = React.useState("");
  const [patientPopoverOpen, setPatientPopoverOpen] = React.useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false);

  const { data: existing, isLoading: isLoadingExisting } = useFollowUp(id);
  const isEditable = !isEditMode || existing?.status === "PENDING";

  const form = useForm<CreateFollowUpFormValues>({
    resolver: zodResolver(createFollowUpSchema),
    defaultValues: {
      patientId: patientIdFromQuery,
      appointmentId: appointmentIdFromQuery,
      followUpDate: "",
      reason: "",
    },
  });

  React.useEffect(() => {
    if (existing) {
      form.reset({
        patientId: existing.patientId,
        appointmentId: existing.appointmentId ?? "",
        followUpDate: existing.followUpDate.slice(0, 10),
        reason: existing.reason,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const patientId = form.watch("patientId");

  const { data: patientsResult } = usePatientsList({
    pageSize: 20,
    search: patientSearch || undefined,
    isActive: true,
  });
  const patients = patientsResult?.items ?? [];
  const selectedPatient =
    patients.find((p) => p.id === patientId) ?? (existing ? existing.patient : undefined);

  const { data: patientAppointmentsResult } = useAppointmentsList({
    patientId: patientId || undefined,
    pageSize: 20,
    sortBy: "appointmentDate",
    sortOrder: "desc",
  });
  const patientAppointments = patientId ? patientAppointmentsResult?.items ?? [] : [];

  const createFollowUp = useCreateFollowUp();
  const updateFollowUp = useUpdateFollowUp();
  const isPending = createFollowUp.isPending || updateFollowUp.isPending;

  function onSubmit(values: CreateFollowUpFormValues) {
    setServerError(null);

    if (isEditMode && id) {
      updateFollowUp.mutate(
        { id, payload: { followUpDate: values.followUpDate, reason: values.reason } },
        {
          onSuccess: () => navigate(`/follow-ups`),
          onError: (error) => setServerError(getErrorMessage(error)),
        }
      );
      return;
    }

    createFollowUp.mutate(
      {
        patientId: values.patientId,
        appointmentId: values.appointmentId || undefined,
        followUpDate: values.followUpDate,
        reason: values.reason,
      },
      {
        onSuccess: () => navigate("/follow-ups"),
        onError: (error) => setServerError(getErrorMessage(error)),
      }
    );
  }

  if (isEditMode && isLoadingExisting) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isEditMode && !existing) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">Follow-up not found.</p>
        <Button variant="outline" onClick={() => navigate("/follow-ups")}>
          Back to follow-ups
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? "Edit Follow-up" : "New Follow-up"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? "Update the follow-up date or reason for this patient."
            : "Schedule a follow-up reminder for a patient."}
        </p>
      </div>

      {isEditMode && existing && !isEditable ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm font-medium">
                This follow-up has already been actioned and can no longer be edited.
              </p>
              <p className="text-sm text-muted-foreground">
                Only follow-ups that are still pending can be edited.
              </p>
            </div>
            <Badge variant={FOLLOWUP_STATUS_BADGE_VARIANT[existing.status]}>
              {FOLLOWUP_STATUS_LABELS[existing.status]}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {serverError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Patient &amp; Visit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start font-normal"
                            disabled={isEditMode}
                          >
                            <Search className="h-4 w-4" />
                            {selectedPatient
                              ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.patientCode})`
                              : "Search patient by name or mobile"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-2" align="start">
                        <Input
                          autoFocus
                          placeholder="Search patients..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="mb-2"
                        />
                        <div className="max-h-60 space-y-1 overflow-y-auto">
                          {patients.length === 0 ? (
                            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No patients found</p>
                          ) : (
                            patients.map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                onClick={() => {
                                  field.onChange(patient.id);
                                  setPatientPopoverOpen(false);
                                }}
                                className={cn(
                                  "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                                  field.value === patient.id && "bg-accent"
                                )}
                              >
                                <div className="font-medium">
                                  {patient.firstName} {patient.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {patient.patientCode} &middot; {patient.mobileNumber}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Appointment (optional)</FormLabel>
                    <Select
                      value={field.value || NO_APPOINTMENT_VALUE}
                      onValueChange={(value) => field.onChange(value === NO_APPOINTMENT_VALUE ? "" : value)}
                      disabled={!patientId || isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={patientId ? "No appointment linked" : "Select a patient first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_APPOINTMENT_VALUE}>No appointment linked</SelectItem>
                        {patientAppointments.map((appointment) => (
                          <SelectItem key={appointment.id} value={appointment.id}>
                            {appointment.appointmentCode} &middot; {appointment.appointmentDate.slice(0, 10)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-up details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up date</FormLabel>
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start font-normal"
                            disabled={!isEditable}
                          >
                            <CalendarIcon className="h-4 w-4" />
                            {formatDateLabel(field.value)}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(`${field.value}T00:00:00`) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(toDateOnlyString(date));
                              setDatePopoverOpen(false);
                            }
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={4}
                        disabled={!isEditable}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="e.g. Review blood test results, post-surgery check-up"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/follow-ups")} disabled={isPending}>
              Cancel
            </Button>
            {isEditable ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditMode ? (
                  "Save changes"
                ) : (
                  "Create follow-up"
                )}
              </Button>
            ) : null}
          </div>
        </form>
      </Form>
    </div>
  );
}
