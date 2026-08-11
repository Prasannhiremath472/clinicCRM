import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeletePatient, usePatientsList } from "@/features/patients/usePatients";
import type {
  BloodGroup,
  Gender,
  ListPatientsParams,
} from "@/features/patients/patients.types";

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

const BLOOD_GROUP_LABELS: Record<BloodGroup, string> = {
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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

const ALL_VALUE = "__all__";

export function PatientsListPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = React.useState("");
  const [gender, setGender] = React.useState<Gender | undefined>(undefined);
  const [bloodGroup, setBloodGroup] = React.useState<BloodGroup | undefined>(undefined);
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = React.useState(1);
  const [patientToDelete, setPatientToDelete] = React.useState<{ id: string; name: string } | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const filters: ListPatientsParams = {
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
    gender,
    bloodGroup,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  };

  const { data, isLoading, isError, refetch } = usePatientsList(filters);
  const deletePatient = useDeletePatient();

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, gender, bloodGroup, activeFilter]);

  const patients = data?.items ?? [];
  const meta = data?.meta;

  function handleDeleteConfirm() {
    if (!patientToDelete) return;
    deletePatient.mutate(patientToDelete.id, {
      onSuccess: () => setPatientToDelete(null),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage patient records for your clinic
          </p>
        </div>
        <Button onClick={() => navigate("/patients/new")} className="shadow-sm">
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 border-b pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Search & Filter</CardTitle>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, or patient code"
                className="pl-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <Select
              value={gender ?? ALL_VALUE}
              onValueChange={(value) => setGender(value === ALL_VALUE ? undefined : (value as Gender))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All genders</SelectItem>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={bloodGroup ?? ALL_VALUE}
              onValueChange={(value) =>
                setBloodGroup(value === ALL_VALUE ? undefined : (value as BloodGroup))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Blood group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All blood groups</SelectItem>
                {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={activeFilter}
              onValueChange={(value) => setActiveFilter(value as "all" | "active" | "inactive")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Something went wrong while loading patients.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <UserRound className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No patients found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try adjusting your search or filters, or register a new patient to get
                started.
              </p>
              <Button onClick={() => navigate("/patients/new")}>
                <Plus className="h-4 w-4" />
                Add Patient
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id} className="cursor-pointer">
                      <TableCell
                        className="font-medium"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        {patient.patientCode}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/patients/${patient.id}`)}>
                        {patient.firstName} {patient.lastName}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/patients/${patient.id}`)}>
                        {GENDER_LABELS[patient.gender]}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/patients/${patient.id}`)}>
                        {patient.age}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/patients/${patient.id}`)}>
                        {patient.mobileNumber}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/patients/${patient.id}`)}>
                        {patient.bloodGroup ? BLOOD_GROUP_LABELS[patient.bloodGroup] : "-"}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/patients/${patient.id}`)}>
                        <Badge variant={patient.isActive ? "success" : "secondary"}>
                          {patient.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/patients/${patient.id}`}>View</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/patients/${patient.id}/edit`}>Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setPatientToDelete({
                                  id: patient.id,
                                  name: `${patient.firstName} ${patient.lastName}`,
                                })
                              }
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {meta ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(meta.page - 1) * meta.pageSize + 1}-
                    {Math.min(meta.page * meta.pageSize, meta.totalItems)} of {meta.totalItems}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={meta.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {meta.page} of {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={meta.page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {patientToDelete ? (
        <ConfirmDeleteDialog
          patientName={patientToDelete.name}
          isDeleting={deletePatient.isPending}
          onCancel={() => setPatientToDelete(null)}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  );
}

function ConfirmDeleteDialog({
  patientName,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  patientName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  React.useEffect(() => {
    if (isDeleting) {
      toast.loading("Deleting patient...", { id: "delete-patient" });
    } else {
      toast.dismiss("delete-patient");
    }
  }, [isDeleting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Delete patient?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will deactivate <span className="font-medium text-foreground">{patientName}</span>
            &apos;s record. This action can be reversed by a clinic admin later.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
