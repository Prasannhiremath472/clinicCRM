import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { Download, FileText, Loader2, Pencil, Stethoscope, Trash2, Upload } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsultationsList } from "@/features/consultations/useConsultations";
import {
  uploadDocumentSchema,
  type UploadDocumentFormValues,
} from "@/features/patients/patients.schemas";
import {
  useDeletePatientDocument,
  usePatient,
  usePatientDocuments,
  useUploadPatientDocument,
} from "@/features/patients/usePatients";
import { usePrescriptionsList } from "@/features/prescriptions/usePrescriptions";
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

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  LAB_REPORT: "Lab Report",
  SCAN: "Scan",
  PRESCRIPTION_UPLOAD: "Prescription",
  ID_PROOF: "ID Proof",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [documentToDelete, setDocumentToDelete] = React.useState<{ id: string; fileName: string } | null>(
    null
  );

  const { data: patient, isLoading, isError } = usePatient(id);
  const { data: documents, isLoading: isLoadingDocuments } = usePatientDocuments(id);
  const { data: visitHistory, isLoading: isLoadingVisitHistory } = useConsultationsList(
    { patientId: id ?? "" },
    { enabled: !!id }
  );
  const { data: prescriptionHistory } = usePrescriptionsList({ patientId: id ?? "" }, { enabled: !!id });
  const consultationIdsWithPrescription = React.useMemo(
    () => new Set((prescriptionHistory?.items ?? []).map((p) => p.consultationId)),
    [prescriptionHistory]
  );
  const deleteDocument = useDeletePatientDocument();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">Patient not found.</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>
          Back to patients
        </Button>
      </div>
    );
  }

  function handleDeleteDocument() {
    if (!documentToDelete || !id) return;
    deleteDocument.mutate(
      { patientId: id, documentId: documentToDelete.id },
      { onSuccess: () => setDocumentToDelete(null) }
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {patient.patientCode} &middot; {GENDER_LABELS[patient.gender]} &middot; {patient.age} yrs
              </p>
              <p className="text-sm text-muted-foreground">{patient.mobileNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={patient.isActive ? "success" : "secondary"}>
              {patient.isActive ? "Active" : "Inactive"}
            </Badge>
            <Button variant="outline" onClick={() => navigate(`/patients/${patient.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Email" value={patient.email ?? "Not provided"} />
            <InfoRow label="Alternate mobile" value={patient.alternateMobile ?? "Not provided"} />
            <InfoRow label="Date of birth" value={formatDate(patient.dateOfBirth)} />
            <InfoRow label="Blood group" value={patient.bloodGroup ? BLOOD_GROUP_LABELS[patient.bloodGroup] : "Unknown"} />
            <InfoRow
              label="Marital status"
              value={patient.maritalStatus ? MARITAL_STATUS_LABELS[patient.maritalStatus] : "Not provided"}
            />
            <InfoRow
              label="Address"
              value={
                [patient.address, patient.city, patient.state, patient.country, patient.pincode]
                  .filter(Boolean)
                  .join(", ") || "Not provided"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Allergies" value={patient.allergies ?? "None recorded"} />
            <InfoRow label="Existing diseases" value={patient.existingDiseases ?? "None recorded"} />
            <InfoRow label="Current medications" value={patient.currentMedications ?? "None recorded"} />
            <InfoRow label="Medical history" value={patient.medicalHistory ?? "None recorded"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Name" value={patient.emergencyContactName ?? "Not provided"} />
            <InfoRow label="Relation" value={patient.emergencyContactRelation ?? "Not provided"} />
            <InfoRow label="Mobile" value={patient.emergencyContactMobile ?? "Not provided"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingVisitHistory ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !visitHistory || visitHistory.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Stethoscope className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No consultations recorded yet.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {visitHistory.items.map((consultation) => (
                  <li key={consultation.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {formatDate(consultation.createdAt)}
                        {consultationIdsWithPrescription.has(consultation.id) ? (
                          <Badge variant="secondary" className="ml-2">
                            Rx
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dr. {consultation.doctor.user.firstName} {consultation.doctor.user.lastName}
                        {consultation.diagnosis ? ` · ${consultation.diagnosis}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {consultationIdsWithPrescription.has(consultation.id) ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/prescriptions/${consultation.id}`}>Rx</Link>
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/consultations/${consultation.appointmentId}`}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Documents</CardTitle>
          <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingDocuments ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{document.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOCUMENT_TYPE_LABELS[document.type]} &middot; {formatDate(document.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDocumentToDelete({ id: document.id, fileName: document.fileName })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {id ? (
        <UploadDocumentDialog
          patientId={id}
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
        />
      ) : null}

      {documentToDelete ? (
        <Dialog open onOpenChange={(open) => !open && setDocumentToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete document?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{documentToDelete.fileName}</span>.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDocumentToDelete(null)}
                disabled={deleteDocument.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteDocument}
                disabled={deleteDocument.isPending}
              >
                {deleteDocument.isPending ? "Deleting..." : "Delete"}
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

function UploadDocumentDialog({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const uploadDocument = useUploadPatientDocument();

  const form = useForm<UploadDocumentFormValues>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: { type: "OTHER" },
  });

  function resetAndClose() {
    setFile(null);
    setFileError(null);
    form.reset({ type: "OTHER" });
    onOpenChange(false);
  }

  function onSubmit(values: UploadDocumentFormValues) {
    if (!file) {
      setFileError("Please select a file to upload");
      return;
    }

    uploadDocument.mutate(
      { patientId, file, type: values.type },
      {
        onSuccess: () => resetAndClose(),
        onError: (error) => {
          const message =
            error instanceof AxiosError
              ? (error.response?.data as ApiErrorResponse | undefined)?.message
              : undefined;
          toast.error(message ?? "Could not upload document.");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="document-file">
                File
              </label>
              <input
                id="document-file"
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setFileError(null);
                }}
              />
              {fileError ? <p className="text-sm font-medium text-destructive">{fileError}</p> : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={uploadDocument.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadDocument.isPending}>
                {uploadDocument.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
