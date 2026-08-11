import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { CalendarIcon, Loader2, Search } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  appointmentTypeOptions,
  createAppointmentSchema,
  type CreateAppointmentFormValues,
} from "@/features/appointments/appointments.schemas";
import {
  useAvailability,
  useCreateAppointment,
  useRescheduleAppointment,
} from "@/features/appointments/useAppointments";
import type { Appointment } from "@/features/appointments/appointments.types";
import { useDoctorsList } from "@/features/doctors/useDoctors";
import { usePatientsList } from "@/features/patients/usePatients";
import type { ApiErrorResponse } from "@/types/api.types";
import { cn } from "@/lib/utils";

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  WALK_IN: "Walk-in",
  ONLINE: "Online",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as ApiErrorResponse | undefined)?.message ??
      "Could not save appointment. Please try again."
    );
  }
  return "Could not save appointment. Please try again.";
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

export interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "reschedule";
  appointment?: Appointment;
  defaultDoctorId?: string;
  defaultDate?: string;
  defaultStartTime?: string;
  onSuccess?: (appointment: Appointment) => void;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  mode,
  appointment,
  defaultDoctorId,
  defaultDate,
  defaultStartTime,
  onSuccess,
}: AppointmentFormDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [patientSearch, setPatientSearch] = React.useState("");
  const [patientPopoverOpen, setPatientPopoverOpen] = React.useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false);

  const isReschedule = mode === "reschedule";

  const form = useForm<CreateAppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      patientId: appointment?.patientId ?? "",
      doctorId: appointment?.doctorId ?? defaultDoctorId ?? "",
      appointmentDate: appointment?.appointmentDate.slice(0, 10) ?? defaultDate ?? "",
      startTime: appointment?.startTime ?? defaultStartTime ?? "",
      type: appointment?.type ?? "WALK_IN",
      notes: appointment?.notes ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      setServerError(null);
      form.reset({
        patientId: appointment?.patientId ?? "",
        doctorId: appointment?.doctorId ?? defaultDoctorId ?? "",
        appointmentDate: appointment?.appointmentDate.slice(0, 10) ?? defaultDate ?? "",
        startTime: appointment?.startTime ?? defaultStartTime ?? "",
        type: appointment?.type ?? "WALK_IN",
        notes: appointment?.notes ?? "",
      });
      setPatientSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment, defaultDoctorId, defaultDate, defaultStartTime]);

  const doctorId = form.watch("doctorId");
  const appointmentDate = form.watch("appointmentDate");
  const selectedStartTime = form.watch("startTime");
  const patientId = form.watch("patientId");

  const { data: doctorsResult } = useDoctorsList({ pageSize: 100, isActive: true });
  const doctors = doctorsResult?.items ?? [];

  const { data: patientsResult } = usePatientsList({
    pageSize: 20,
    search: patientSearch || undefined,
    isActive: true,
  });
  const patients = patientsResult?.items ?? [];
  const selectedPatient = patients.find((p) => p.id === patientId);

  const { data: availability, isFetching: isFetchingAvailability } = useAvailability({
    doctorId: doctorId || undefined,
    date: appointmentDate || undefined,
  });

  const createAppointment = useCreateAppointment();
  const rescheduleAppointment = useRescheduleAppointment();
  const isPending = createAppointment.isPending || rescheduleAppointment.isPending;

  function onSubmit(values: CreateAppointmentFormValues) {
    setServerError(null);

    if (isReschedule && appointment) {
      rescheduleAppointment.mutate(
        { id: appointment.id, payload: { appointmentDate: values.appointmentDate, startTime: values.startTime } },
        {
          onSuccess: (updated) => {
            onOpenChange(false);
            onSuccess?.(updated);
          },
          onError: (error) => setServerError(getErrorMessage(error)),
        }
      );
      return;
    }

    createAppointment.mutate(
      {
        patientId: values.patientId,
        doctorId: values.doctorId,
        appointmentDate: values.appointmentDate,
        startTime: values.startTime,
        type: values.type,
        notes: values.notes === "" ? undefined : values.notes,
      },
      {
        onSuccess: (created) => {
          onOpenChange(false);
          onSuccess?.(created);
        },
        onError: (error) => setServerError(getErrorMessage(error)),
      }
    );
  }

  const slots = availability?.slots ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReschedule ? "Reschedule Appointment" : "New Appointment"}</DialogTitle>
          <DialogDescription>
            {isReschedule
              ? "Pick a new date and time slot for this appointment."
              : "Book a new appointment for a patient with a doctor."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </div>
            ) : null}

            {!isReschedule ? (
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
                            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                              No patients found
                            </p>
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
                                  field.value === patient.id && "bg-accent",
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
            ) : null}

            {!isReschedule ? (
              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            Dr. {doctor.user.firstName} {doctor.user.lastName} ({doctor.specialization})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button type="button" variant="outline" className="w-full justify-start font-normal">
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
                            form.setValue("startTime", "");
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
              name="startTime"
              render={() => (
                <FormItem>
                  <FormLabel>Time slot</FormLabel>
                  {!doctorId || !appointmentDate ? (
                    <p className="text-sm text-muted-foreground">
                      Select a doctor and date to see available slots.
                    </p>
                  ) : isFetchingAvailability ? (
                    <p className="text-sm text-muted-foreground">Loading available slots...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No available slots for this doctor on the selected date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((slot) => (
                        <Button
                          key={slot.startTime}
                          type="button"
                          size="sm"
                          variant={selectedStartTime === slot.startTime ? "default" : "outline"}
                          onClick={() => form.setValue("startTime", slot.startTime, { shouldValidate: true })}
                        >
                          {slot.startTime}
                        </Button>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isReschedule ? (
              <>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {appointmentTypeOptions.map((value) => (
                            <SelectItem key={value} value={value}>
                              {APPOINTMENT_TYPE_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Reason for visit, special instructions, etc."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isReschedule ? (
                  "Reschedule"
                ) : (
                  "Book appointment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
