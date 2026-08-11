import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDoctorsList } from "@/features/doctors/useDoctors";
import { usePatientsList } from "@/features/patients/usePatients";

const ALL_VALUE = "__all__";

export interface StatusOption {
  value: string;
  label: string;
}

export interface ReportFiltersValue {
  fromDate: string;
  toDate: string;
  doctorId?: string;
  patientId?: string;
  status?: string;
}

export interface ReportFiltersProps {
  value: ReportFiltersValue;
  onChange: (value: ReportFiltersValue) => void;
  onRun: () => void;
  isRunning?: boolean;
  showDoctorFilter?: boolean;
  showPatientFilter?: boolean;
  showStatusFilter?: boolean;
  statusOptions?: StatusOption[];
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

export function ReportFilters({
  value,
  onChange,
  onRun,
  isRunning = false,
  showDoctorFilter = false,
  showPatientFilter = false,
  showStatusFilter = false,
  statusOptions = [],
}: ReportFiltersProps) {
  const [patientSearch, setPatientSearch] = React.useState("");
  const debouncedPatientSearch = useDebouncedValue(patientSearch, 400);

  const { data: doctorsResult } = useDoctorsList({ pageSize: 100, isActive: true });
  const doctors = showDoctorFilter ? doctorsResult?.items ?? [] : [];

  const { data: patientsResult } = usePatientsList({
    pageSize: 20,
    search: debouncedPatientSearch || undefined,
  });
  const patients = showPatientFilter ? patientsResult?.items ?? [] : [];

  function patchValue(patch: Partial<ReportFiltersValue>): void {
    onChange({ ...value, ...patch });
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle className="text-base">Filters</CardTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From date</label>
            <Input
              type="date"
              className="w-[160px]"
              value={value.fromDate}
              onChange={(e) => patchValue({ fromDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To date</label>
            <Input
              type="date"
              className="w-[160px]"
              value={value.toDate}
              onChange={(e) => patchValue({ toDate: e.target.value })}
            />
          </div>

          {showDoctorFilter ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Doctor</label>
              <Select
                value={value.doctorId ?? ALL_VALUE}
                onValueChange={(v) => patchValue({ doctorId: v === ALL_VALUE ? undefined : v })}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All doctors</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.user.firstName} {doctor.user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {showPatientFilter ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Patient</label>
              <Select
                value={value.patientId ?? ALL_VALUE}
                onValueChange={(v) => patchValue({ patientId: v === ALL_VALUE ? undefined : v })}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All patients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All patients</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName} ({patient.patientCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search patient..."
                className="w-[220px]"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>
          ) : null}

          {showStatusFilter ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={value.status ?? ALL_VALUE}
                onValueChange={(v) => patchValue({ status: v === ALL_VALUE ? undefined : v })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <Button onClick={onRun} disabled={isRunning}>
            {isRunning ? "Running..." : "Run Report"}
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
