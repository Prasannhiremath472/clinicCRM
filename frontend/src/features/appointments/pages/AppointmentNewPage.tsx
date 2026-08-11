import * as React from "react";
import { useNavigate } from "react-router-dom";

import { AppointmentFormDialog } from "@/features/appointments/components/AppointmentFormDialog";
import type { Appointment } from "@/features/appointments/appointments.types";

/**
 * Direct-link target for "New Appointment" actions (e.g. from the sidebar or external
 * links). Renders the create dialog pre-opened over the appointments list and returns
 * to the list (or the newly created appointment) once the dialog closes.
 */
export function AppointmentNewPage() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(true);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      navigate("/appointments");
    }
  }

  function handleSuccess(appointment: Appointment) {
    navigate(`/appointments/${appointment.id}`, { replace: true });
  }

  return (
    <AppointmentFormDialog
      mode="create"
      open={open}
      onOpenChange={handleOpenChange}
      onSuccess={handleSuccess}
    />
  );
}
