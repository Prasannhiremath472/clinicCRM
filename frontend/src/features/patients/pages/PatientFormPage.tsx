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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  bloodGroupOptions,
  createPatientSchema,
  genderOptions,
  maritalStatusOptions,
  type CreatePatientFormValues,
} from "@/features/patients/patients.schemas";
import { usePatient, useCreatePatient, useUpdatePatient } from "@/features/patients/usePatients";
import type { ApiErrorResponse } from "@/types/api.types";

const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
  UNKNOWN: "Unknown",
};

const MARITAL_STATUS_LABELS: Record<string, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
  OTHER: "Other",
};

const EMPTY_VALUES: CreatePatientFormValues = {
  firstName: "",
  lastName: "",
  gender: "MALE",
  dateOfBirth: "",
  mobileNumber: "",
  alternateMobile: "",
  email: "",
  bloodGroup: "UNKNOWN",
  maritalStatus: undefined,
  country: "",
  state: "",
  city: "",
  pincode: "",
  address: "",
  allergies: "",
  existingDiseases: "",
  currentMedications: "",
  medicalHistory: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactMobile: "",
};

function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function PatientFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { data: existingPatient, isLoading: isLoadingPatient } = usePatient(id);
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();

  const form = useForm<CreatePatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: EMPTY_VALUES,
  });

  React.useEffect(() => {
    if (existingPatient) {
      form.reset({
        firstName: existingPatient.firstName,
        lastName: existingPatient.lastName,
        gender: existingPatient.gender,
        dateOfBirth: existingPatient.dateOfBirth.slice(0, 10),
        mobileNumber: existingPatient.mobileNumber,
        alternateMobile: existingPatient.alternateMobile ?? "",
        email: existingPatient.email ?? "",
        bloodGroup: existingPatient.bloodGroup ?? "UNKNOWN",
        maritalStatus: existingPatient.maritalStatus ?? undefined,
        country: existingPatient.country ?? "",
        state: existingPatient.state ?? "",
        city: existingPatient.city ?? "",
        pincode: existingPatient.pincode ?? "",
        address: existingPatient.address ?? "",
        allergies: existingPatient.allergies ?? "",
        existingDiseases: existingPatient.existingDiseases ?? "",
        currentMedications: existingPatient.currentMedications ?? "",
        medicalHistory: existingPatient.medicalHistory ?? "",
        emergencyContactName: existingPatient.emergencyContactName ?? "",
        emergencyContactRelation: existingPatient.emergencyContactRelation ?? "",
        emergencyContactMobile: existingPatient.emergencyContactMobile ?? "",
      });
    }
  }, [existingPatient, form]);

  const dateOfBirth = form.watch("dateOfBirth");
  const liveAge = calculateAge(dateOfBirth);

  const isSaving = createPatient.isPending || updatePatient.isPending;

  function cleanPayload(values: CreatePatientFormValues) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      cleaned[key] = value === "" ? undefined : value;
    }
    return cleaned as CreatePatientFormValues;
  }

  function onSubmit(values: CreatePatientFormValues) {
    setServerError(null);
    const payload = cleanPayload(values);

    if (isEditMode && id) {
      updatePatient.mutate(
        { id, payload },
        {
          onSuccess: () => {
            navigate(`/patients/${id}`, { replace: true });
          },
          onError: (error) => setServerError(getErrorMessage(error)),
        }
      );
    } else {
      createPatient.mutate(payload, {
        onSuccess: (patient) => {
          navigate(`/patients/${patient.id}`, { replace: true });
        },
        onError: (error) => setServerError(getErrorMessage(error)),
      });
    }
  }

  function getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      return (
        (error.response?.data as ApiErrorResponse | undefined)?.message ??
        "Could not save patient. Please try again."
      );
    }
    return "Could not save patient. Please try again.";
  }

  if (isEditMode && isLoadingPatient) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? "Edit Patient" : "Register New Patient"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? "Update the patient's information below."
            : "Fill in the patient details to create a new record."}
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
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic identification and contact details</CardDescription>
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
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genderOptions.map((value) => (
                          <SelectItem key={value} value={value}>
                            {GENDER_LABELS[value]}
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
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Date of birth
                      {liveAge !== null ? (
                        <span className="ml-2 font-normal text-muted-foreground">
                          (Age: {liveAge})
                        </span>
                      ) : null}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alternateMobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternate mobile</FormLabel>
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
                name="bloodGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "UNKNOWN"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bloodGroupOptions.map((value) => (
                          <SelectItem key={value} value={value}>
                            {BLOOD_GROUP_LABELS[value]}
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
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maritalStatusOptions.map((value) => (
                          <SelectItem key={value} value={value}>
                            {MARITAL_STATUS_LABELS[value]}
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
              <CardTitle>Address</CardTitle>
              <CardDescription>Where the patient currently resides</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
              <CardDescription>Known allergies, conditions, and medications</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergies</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="existingDiseases"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existing diseases</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentMedications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current medications</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="medicalHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical history</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>
                Optional, but if provided all three fields are required
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactRelation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relation</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactMobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                "Save changes"
              ) : (
                "Register patient"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
