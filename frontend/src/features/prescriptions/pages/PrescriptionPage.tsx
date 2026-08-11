import { AxiosError } from "axios";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PrescriptionForm } from "@/features/prescriptions/components/PrescriptionForm";
import { usePrescriptionByConsultation } from "@/features/prescriptions/usePrescriptions";
import type { ApiErrorResponse } from "@/types/api.types";

export function PrescriptionPage() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();

  const { data: prescription, isLoading, isError, error } = usePrescriptionByConsultation(consultationId);

  const prescriptionMissing = isError && error instanceof AxiosError && error.response?.status === 404;

  if (!consultationId) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">No consultation specified.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
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

  if (isError && !prescriptionMissing) {
    const message =
      error instanceof AxiosError ? (error.response?.data as ApiErrorResponse | undefined)?.message : undefined;
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">{message ?? "Could not load this prescription."}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prescription</h1>
          {prescription ? (
            <p className="text-sm text-muted-foreground">{prescription.prescriptionCode}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No prescription yet for this visit</p>
          )}
        </div>
      </div>

      <PrescriptionForm consultationId={consultationId} prescription={prescription ?? null} />
    </div>
  );
}
