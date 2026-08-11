import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  createDoctorSchema,
  updateDoctorSchema,
  type CreateDoctorFormValues,
  type UpdateDoctorFormValues,
} from "@/features/doctors/doctors.schemas";
import { useCreateDoctor, useDoctor, useUpdateDoctor } from "@/features/doctors/useDoctors";
import type { ApiErrorResponse } from "@/types/api.types";

const EMPTY_CREATE_VALUES: CreateDoctorFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  qualification: "",
  specialization: "",
  experienceYears: 0,
  consultationFee: 0,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as ApiErrorResponse | undefined)?.message ??
      "Could not save doctor. Please try again."
    );
  }
  return "Could not save doctor. Please try again.";
}

export function DoctorFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();

  if (isEditMode && id) {
    return <EditDoctorForm id={id} navigate={navigate} />;
  }

  return <CreateDoctorForm navigate={navigate} />;
}

function CreateDoctorForm({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const createDoctor = useCreateDoctor();

  const form = useForm<CreateDoctorFormValues>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: EMPTY_CREATE_VALUES,
  });

  function onSubmit(values: CreateDoctorFormValues) {
    setServerError(null);
    const payload = {
      ...values,
      phone: values.phone === "" ? undefined : values.phone,
    };

    createDoctor.mutate(payload, {
      onSuccess: (doctor) => {
        navigate(`/doctors/${doctor.id}`, { replace: true });
      },
      onError: (error) => setServerError(getErrorMessage(error)),
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Doctor</h1>
        <p className="text-sm text-muted-foreground">
          Create a login account and profile for a new doctor.
        </p>
      </div>

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
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Used by the doctor to log in to the clinic CRM</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Qualification, specialization, and consultation details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="qualification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualification</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MBBS, MD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cardiology" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="experienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience (years)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consultationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultation fee</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={createDoctor.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDoctor.isPending}>
              {createDoctor.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Create doctor"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function EditDoctorForm({ id, navigate }: { id: string; navigate: ReturnType<typeof useNavigate> }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const { data: doctor, isLoading } = useDoctor(id);
  const updateDoctor = useUpdateDoctor();

  const form = useForm<UpdateDoctorFormValues>({
    resolver: zodResolver(updateDoctorSchema),
    defaultValues: {
      qualification: "",
      specialization: "",
      experienceYears: 0,
      consultationFee: 0,
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (doctor) {
      form.reset({
        qualification: doctor.qualification,
        specialization: doctor.specialization,
        experienceYears: doctor.experienceYears,
        consultationFee: Number(doctor.consultationFee),
        isActive: doctor.isActive,
      });
    }
  }, [doctor, form]);

  function onSubmit(values: UpdateDoctorFormValues) {
    setServerError(null);
    updateDoctor.mutate(
      { id, payload: values },
      {
        onSuccess: () => navigate(`/doctors/${id}`, { replace: true }),
        onError: (error) => setServerError(getErrorMessage(error)),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">Doctor not found.</p>
        <Button variant="outline" onClick={() => navigate("/doctors")}>
          Back to doctors
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Doctor</h1>
        <p className="text-sm text-muted-foreground">
          Update profile details for Dr. {doctor.user.firstName} {doctor.user.lastName}.
        </p>
      </div>

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
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Email and password are managed separately and cannot be changed here.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium leading-none">Email</p>
                <p className="mt-2 text-sm text-muted-foreground">{doctor.user.email} (read-only)</p>
              </div>
              <div>
                <p className="text-sm font-medium leading-none">Doctor code</p>
                <p className="mt-2 text-sm text-muted-foreground">{doctor.doctorCode}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Qualification, specialization, and consultation details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="qualification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualification</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="experienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience (years)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consultationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultation fee</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={updateDoctor.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateDoctor.isPending}>
              {updateDoctor.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
