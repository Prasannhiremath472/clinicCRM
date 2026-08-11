import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Loader2, Plus, Search, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { formatCurrency } from "@/features/billing/billing.constants";
import {
  createInvoiceSchema,
  EMPTY_INVOICE_ITEM,
  type CreateInvoiceFormValues,
} from "@/features/billing/billing.schemas";
import { useCreateInvoice, useSuggestInvoiceItems } from "@/features/billing/useBilling";
import { useAppointmentsList } from "@/features/appointments/useAppointments";
import { usePatientsList } from "@/features/patients/usePatients";
import type { ApiErrorResponse } from "@/types/api.types";
import { cn } from "@/lib/utils";

const NO_APPOINTMENT_VALUE = "__none__";

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as ApiErrorResponse | undefined)?.message ??
      "Could not create invoice. Please try again."
    );
  }
  return "Could not create invoice. Please try again.";
}

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentIdFromQuery = searchParams.get("appointmentId") ?? "";

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [patientSearch, setPatientSearch] = React.useState("");
  const [patientPopoverOpen, setPatientPopoverOpen] = React.useState(false);

  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      patientId: "",
      appointmentId: appointmentIdFromQuery,
      items: [EMPTY_INVOICE_ITEM],
      discount: 0,
      tax: 0,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "items" });

  const patientId = form.watch("patientId");
  const appointmentId = form.watch("appointmentId");
  const items = form.watch("items");
  const discount = form.watch("discount") ?? 0;
  const tax = form.watch("tax") ?? 0;

  const { data: patientsResult } = usePatientsList({
    pageSize: 20,
    search: patientSearch || undefined,
    isActive: true,
  });
  const patients = patientsResult?.items ?? [];
  const selectedPatient = patients.find((p) => p.id === patientId);

  const { data: patientAppointmentsResult } = useAppointmentsList({
    patientId: patientId || undefined,
    pageSize: 20,
    sortBy: "appointmentDate",
    sortOrder: "desc",
  });
  const patientAppointments = patientId ? patientAppointmentsResult?.items ?? [] : [];

  const { data: suggestedItems, refetch: refetchSuggestions, isFetching: isSuggesting } = useSuggestInvoiceItems(
    appointmentId || undefined
  );

  const createInvoice = useCreateInvoice();

  React.useEffect(() => {
    if (appointmentIdFromQuery) {
      void refetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentIdFromQuery]);

  function applySuggestions() {
    if (!suggestedItems || suggestedItems.length === 0) return;
    const hasOnlyEmptyItem =
      items.length === 1 && !items[0].description && items[0].unitPrice === 0;
    const newItems = suggestedItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
    if (hasOnlyEmptyItem) {
      replace(newItems);
    } else {
      newItems.forEach((item) => append(item));
    }
  }

  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return sum + quantity * unitPrice;
  }, 0);
  const total = Math.max(0, subtotal - Number(discount || 0)) + Number(tax || 0);

  function onSubmit(values: CreateInvoiceFormValues) {
    setServerError(null);

    createInvoice.mutate(
      {
        patientId: values.patientId,
        appointmentId: values.appointmentId || undefined,
        items: values.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        discount: values.discount,
        tax: values.tax,
      },
      {
        onSuccess: (invoice) => {
          navigate(`/billing/${invoice.id}`);
        },
        onError: (error) => setServerError(getErrorMessage(error)),
      }
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Invoice</h1>
        <p className="text-sm text-muted-foreground">Create a new invoice for a patient</p>
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
              <CardTitle>Patient &amp; Appointment</CardTitle>
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
                          <Button type="button" variant="outline" className="w-full justify-start font-normal">
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
                      disabled={!patientId}
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
                            {appointment.appointmentCode} &middot; {appointment.appointmentDate.slice(0, 10)} &middot;{" "}
                            Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {appointmentId && suggestedItems && suggestedItems.length > 0 ? (
                <Button type="button" variant="outline" size="sm" onClick={applySuggestions} disabled={isSuggesting}>
                  <Sparkles className="h-4 w-4" />
                  Suggest from appointment
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => {
                const quantity = Number(items[index]?.quantity) || 0;
                const unitPrice = Number(items[index]?.unitPrice) || 0;
                const amount = quantity * unitPrice;

                return (
                  <div key={field.id} className="grid gap-3 rounded-md border p-4 sm:grid-cols-5 sm:items-start">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field: inputField }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Consultation Fee" {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>Qty</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} step={1} {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel>Unit Price</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} step="0.01" {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium leading-none">Amount</p>
                        <p className="mt-2 text-sm text-muted-foreground">{formatCurrency(amount)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={fields.length <= 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_INVOICE_ITEM)}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>

              {form.formState.errors.items?.root || form.formState.errors.items?.message ? (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.items.root?.message ?? form.formState.errors.items.message}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (flat amount)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax (flat amount)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-1 rounded-md border p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatCurrency(discount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>+{formatCurrency(tax || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/billing")} disabled={createInvoice.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
