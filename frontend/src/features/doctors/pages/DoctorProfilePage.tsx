import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { CalendarOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  createLeaveSchema,
  upsertScheduleSchema,
  weekDayOptions,
  type CreateLeaveFormValues,
  type UpsertScheduleFormValues,
} from "@/features/doctors/doctors.schemas";
import type { DoctorSchedule, WeekDay } from "@/features/doctors/doctors.types";
import {
  useAddDoctorLeave,
  useDeleteDoctorLeave,
  useDoctor,
  useDoctorLeaves,
  useDoctorSchedule,
  useSetDoctorSchedule,
} from "@/features/doctors/useDoctors";
import { useAuthStore } from "@/store/auth.store";
import type { ApiErrorResponse } from "@/types/api.types";

const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

function formatFee(fee: string): string {
  const value = Number(fee);
  return Number.isNaN(value) ? fee : value.toFixed(2);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "CLINIC_ADMIN";
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = React.useState(false);
  const [leaveToDelete, setLeaveToDelete] = React.useState<{ id: string; date: string } | null>(null);

  const { data: doctor, isLoading, isError } = useDoctor(id);
  const { data: schedules, isLoading: isLoadingSchedule } = useDoctorSchedule(id);
  const { data: leaves, isLoading: isLoadingLeaves } = useDoctorLeaves(id);
  const deleteLeave = useDeleteDoctorLeave();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">Doctor not found.</p>
        <Button variant="outline" onClick={() => navigate("/doctors")}>
          Back to doctors
        </Button>
      </div>
    );
  }

  const sortedSchedules = [...(schedules ?? [])].sort(
    (a, b) => weekDayOptions.indexOf(a.weekDay) - weekDayOptions.indexOf(b.weekDay)
  );

  const upcomingLeaves = (leaves ?? []).filter(
    (leave) => new Date(leave.date).getTime() >= new Date().setHours(0, 0, 0, 0)
  );

  function handleDeleteLeave() {
    if (!leaveToDelete || !id) return;
    deleteLeave.mutate(
      { id, leaveId: leaveToDelete.id },
      { onSuccess: () => setLeaveToDelete(null) }
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {doctor.user.firstName[0]}
              {doctor.user.lastName[0]}
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                Dr. {doctor.user.firstName} {doctor.user.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {doctor.doctorCode} &middot; {doctor.specialization}
              </p>
              <p className="text-sm text-muted-foreground">{doctor.user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={doctor.isActive ? "success" : "secondary"}>
              {doctor.isActive ? "Active" : "Inactive"}
            </Badge>
            {isAdmin ? (
              <Button variant="outline" onClick={() => navigate(`/doctors/${doctor.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Qualification" value={doctor.qualification} />
            <InfoRow label="Specialization" value={doctor.specialization} />
            <InfoRow label="Experience" value={`${doctor.experienceYears} years`} />
            <InfoRow label="Consultation fee" value={formatFee(doctor.consultationFee)} />
            <InfoRow label="Phone" value={doctor.user.phone ?? "Not provided"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Appointment and consultation statistics will appear here once the Appointments
              module is available.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Weekly Schedule</CardTitle>
          {isAdmin ? (
            <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit Schedule
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoadingSchedule ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sortedSchedules.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No weekly schedule configured yet.</p>
          ) : (
            <ul className="divide-y">
              {sortedSchedules.map((schedule) => (
                <li key={schedule.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="font-medium">{WEEK_DAY_LABELS[schedule.weekDay]}</span>
                  <span className="text-muted-foreground">
                    {schedule.startTime} - {schedule.endTime} &middot; {schedule.slotDurationMinutes} min slots
                  </span>
                  <Badge variant={schedule.isActive ? "success" : "secondary"}>
                    {schedule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leaves</CardTitle>
          {isAdmin ? (
            <Button size="sm" onClick={() => setLeaveDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Leave
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoadingLeaves ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : upcomingLeaves.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarOff className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No upcoming leaves scheduled.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {upcomingLeaves.map((leave) => (
                <li key={leave.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{formatDate(leave.date)}</p>
                    <p className="text-muted-foreground">{leave.reason ?? "No reason provided"}</p>
                  </div>
                  {isAdmin ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLeaveToDelete({ id: leave.id, date: leave.date })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {id ? (
        <EditScheduleDialog
          doctorId={id}
          existingSchedules={schedules ?? []}
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
        />
      ) : null}

      {id ? (
        <AddLeaveDialog doctorId={id} open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} />
      ) : null}

      {leaveToDelete ? (
        <Dialog open onOpenChange={(open) => !open && setLeaveToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove leave?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will remove the leave on{" "}
              <span className="font-medium text-foreground">{formatDate(leaveToDelete.date)}</span>.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveToDelete(null)} disabled={deleteLeave.isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteLeave} disabled={deleteLeave.isPending}>
                {deleteLeave.isPending ? "Removing..." : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function buildDefaultScheduleValues(existingSchedules: DoctorSchedule[]): UpsertScheduleFormValues {
  return {
    schedules: weekDayOptions.map((weekDay) => {
      const existing = existingSchedules.find((s) => s.weekDay === weekDay);
      return {
        weekDay,
        startTime: existing?.startTime ?? "09:00",
        endTime: existing?.endTime ?? "17:00",
        slotDurationMinutes: existing?.slotDurationMinutes ?? 15,
        isActive: existing?.isActive ?? false,
      };
    }),
  };
}

function EditScheduleDialog({
  doctorId,
  existingSchedules,
  open,
  onOpenChange,
}: {
  doctorId: string;
  existingSchedules: DoctorSchedule[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setSchedule = useSetDoctorSchedule();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<UpsertScheduleFormValues>({
    resolver: zodResolver(upsertScheduleSchema),
    defaultValues: buildDefaultScheduleValues(existingSchedules),
  });

  const { fields } = useFieldArray({ control: form.control, name: "schedules" });

  React.useEffect(() => {
    if (open) {
      form.reset(buildDefaultScheduleValues(existingSchedules));
      setServerError(null);
    }
  }, [open, existingSchedules, form]);

  function onSubmit(values: UpsertScheduleFormValues) {
    setServerError(null);
    const activeSchedules = values.schedules.filter((s) => s.isActive);

    setSchedule.mutate(
      { id: doctorId, payload: { schedules: activeSchedules } },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          const message =
            error instanceof AxiosError
              ? (error.response?.data as ApiErrorResponse | undefined)?.message
              : undefined;
          setServerError(message ?? "Could not update schedule.");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit weekly schedule</DialogTitle>
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

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[110px_1fr_1fr_90px_60px] items-end gap-2">
                  <FormField
                    control={form.control}
                    name={`schedules.${index}.isActive`}
                    render={({ field: checkboxField }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={checkboxField.value}
                            onCheckedChange={(checked) => checkboxField.onChange(checked === true)}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {WEEK_DAY_LABELS[weekDayOptions[index]]}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`schedules.${index}.startTime`}
                    render={({ field: timeField }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="time" {...timeField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`schedules.${index}.endTime`}
                    render={({ field: timeField }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="time" {...timeField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`schedules.${index}.slotDurationMinutes`}
                    render={({ field: minutesField }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="number" min={1} {...minutesField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span className="pb-2 text-xs text-muted-foreground">min</span>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={setSchedule.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={setSchedule.isPending}>
                {setSchedule.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save schedule"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddLeaveDialog({
  doctorId,
  open,
  onOpenChange,
}: {
  doctorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addLeave = useAddDoctorLeave();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<CreateLeaveFormValues>({
    resolver: zodResolver(createLeaveSchema),
    defaultValues: { date: "", reason: "" },
  });

  function resetAndClose() {
    form.reset({ date: "", reason: "" });
    setServerError(null);
    onOpenChange(false);
  }

  function onSubmit(values: CreateLeaveFormValues) {
    setServerError(null);
    addLeave.mutate(
      { id: doctorId, payload: { date: values.date, reason: values.reason || undefined } },
      {
        onSuccess: () => resetAndClose(),
        onError: (error) => {
          const message =
            error instanceof AxiosError
              ? (error.response?.data as ApiErrorResponse | undefined)?.message
              : undefined;
          setServerError(message ?? "Could not add leave.");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add leave</DialogTitle>
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

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" min={new Date().toISOString().slice(0, 10)} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={addLeave.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLeave.isPending}>
                {addLeave.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add leave"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
