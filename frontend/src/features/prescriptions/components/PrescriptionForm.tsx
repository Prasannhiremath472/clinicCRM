import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  EMPTY_PRESCRIPTION_ITEM,
  savePrescriptionSchema,
  type SavePrescriptionFormValues,
} from "@/features/prescriptions/prescriptions.schemas";
import type { Prescription } from "@/features/prescriptions/prescriptions.types";
import { useSavePrescription } from "@/features/prescriptions/usePrescriptions";
import { useAuthStore } from "@/store/auth.store";

export interface PrescriptionFormProps {
  consultationId: string;
  prescription: Prescription | null;
  readOnly?: boolean;
}

function toFormValues(prescription: Prescription | null): SavePrescriptionFormValues {
  if (!prescription || prescription.items.length === 0) {
    return { notes: prescription?.notes ?? "", items: [EMPTY_PRESCRIPTION_ITEM] };
  }

  return {
    notes: prescription.notes ?? "",
    items: prescription.items.map((item) => ({
      medicineName: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions ?? "",
    })),
  };
}

function buildPayload(values: SavePrescriptionFormValues) {
  return {
    notes: values.notes || undefined,
    items: values.items.map((item) => ({
      medicineName: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions || undefined,
    })),
  };
}

export function PrescriptionForm({ consultationId, prescription, readOnly = false }: PrescriptionFormProps) {
  const role = useAuthStore((s) => s.user?.role);
  const isDoctor = role === "DOCTOR";
  const isEditable = !readOnly && isDoctor;

  const form = useForm<SavePrescriptionFormValues>({
    resolver: zodResolver(savePrescriptionSchema),
    values: toFormValues(prescription),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const savePrescription = useSavePrescription();

  function onSubmit(values: SavePrescriptionFormValues) {
    savePrescription.mutate({ consultationId, payload: buildPayload(values) });
  }

  if (!isEditable && !prescription) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm font-medium">No prescription has been written for this visit yet.</p>
          {!isDoctor ? (
            <p className="text-sm text-muted-foreground">Only the treating doctor can write a prescription.</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Prescription</CardTitle>
          {prescription ? (
            <span className="text-sm text-muted-foreground">{prescription.prescriptionCode}</span>
          ) : null}
        </CardHeader>
        <CardContent>
          {prescription?.pdfUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={prescription.pdfUrl} target="_blank" rel="noreferrer" download>
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            </Button>
          ) : prescription ? (
            <p className="text-sm text-muted-foreground">
              PDF unavailable &mdash; file storage is not configured. Medicine details below are still saved.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Medicines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-start"
                >
                  <FormField
                    control={form.control}
                    name={`items.${index}.medicineName`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel>Medicine</FormLabel>
                        <FormControl>
                          <Input placeholder="Paracetamol" disabled={!isEditable} {...inputField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.dosage`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel>Dosage</FormLabel>
                        <FormControl>
                          <Input placeholder="500mg" disabled={!isEditable} {...inputField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.frequency`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <FormControl>
                          <Input placeholder="1-0-1" disabled={!isEditable} {...inputField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.duration`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <Input placeholder="5 days" disabled={!isEditable} {...inputField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.instructions`}
                      render={({ field: inputField }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Instructions</FormLabel>
                          <FormControl>
                            <Input placeholder="After food" disabled={!isEditable} {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {isEditable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6"
                        disabled={fields.length <= 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}

              {isEditable ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(EMPTY_PRESCRIPTION_ITEM)}
                >
                  <Plus className="h-4 w-4" />
                  Add medicine
                </Button>
              ) : null}

              {form.formState.errors.items?.root || form.formState.errors.items?.message ? (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.items.root?.message ?? form.formState.errors.items.message}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <textarea
                        rows={3}
                        disabled={!isEditable}
                        placeholder="Additional instructions for the patient"
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
            <div className="flex justify-end">
              <Button type="submit" disabled={savePrescription.isPending}>
                {savePrescription.isPending ? "Saving..." : "Save prescription"}
              </Button>
            </div>
          ) : null}
        </form>
      </Form>
    </div>
  );
}
