import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Appointment } from "@/features/appointments/appointments.types";
import { useCancelAppointment } from "@/features/appointments/useAppointments";

export interface CancelAppointmentDialogProps {
  appointment: Appointment;
  onClose: () => void;
}

export function CancelAppointmentDialog({ appointment, onClose }: CancelAppointmentDialogProps) {
  const [reason, setReason] = React.useState("");
  const cancelAppointment = useCancelAppointment();

  function handleConfirm() {
    cancelAppointment.mutate(
      { id: appointment.id, payload: { cancelReason: reason || undefined } },
      { onSuccess: onClose }
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel appointment?</DialogTitle>
          <DialogDescription>
            This will cancel appointment {appointment.appointmentCode} for{" "}
            {appointment.patient.firstName} {appointment.patient.lastName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Reason (optional)</Label>
          <textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Patient requested cancellation"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cancelAppointment.isPending}>
            Keep appointment
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={cancelAppointment.isPending}>
            {cancelAppointment.isPending ? "Cancelling..." : "Cancel appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
