import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Stethoscope,
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
import { useDeactivateDoctor, useDoctorsList } from "@/features/doctors/useDoctors";
import type { ListDoctorsParams } from "@/features/doctors/doctors.types";
import { useAuthStore } from "@/store/auth.store";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

function formatFee(fee: string): string {
  const value = Number(fee);
  return Number.isNaN(value) ? fee : value.toFixed(2);
}

export function DoctorsListPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "CLINIC_ADMIN";

  const [searchInput, setSearchInput] = React.useState("");
  const [specializationInput, setSpecializationInput] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = React.useState(1);
  const [doctorToDeactivate, setDoctorToDeactivate] = React.useState<{ id: string; name: string } | null>(
    null
  );

  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const debouncedSpecialization = useDebouncedValue(specializationInput, 400);

  const filters: ListDoctorsParams = {
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
    specialization: debouncedSpecialization || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  };

  const { data, isLoading, isError, refetch } = useDoctorsList(filters);
  const deactivateDoctor = useDeactivateDoctor();

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedSpecialization, activeFilter]);

  const doctors = data?.items ?? [];
  const meta = data?.meta;

  function handleDeactivateConfirm() {
    if (!doctorToDeactivate) return;
    deactivateDoctor.mutate(doctorToDeactivate.id, {
      onSuccess: () => setDoctorToDeactivate(null),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctors</h1>
          <p className="text-sm text-muted-foreground">
            Manage doctor profiles and schedules for your clinic
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => navigate("/doctors/new")}>
            <Plus className="h-4 w-4" />
            Add Doctor
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-base">Search & filter</CardTitle>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, specialization, or doctor code"
                className="pl-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <Input
              placeholder="Filter by specialization"
              className="w-[220px]"
              value={specializationInput}
              onChange={(e) => setSpecializationInput(e.target.value)}
            />

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
                Something went wrong while loading doctors.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Stethoscope className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No doctors found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try adjusting your search or filters{isAdmin ? ", or add a new doctor to get started." : "."}
              </p>
              {isAdmin ? (
                <Button onClick={() => navigate("/doctors/new")}>
                  <Plus className="h-4 w-4" />
                  Add Doctor
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((doctor) => (
                    <TableRow key={doctor.id} className="cursor-pointer">
                      <TableCell
                        className="font-medium"
                        onClick={() => navigate(`/doctors/${doctor.id}`)}
                      >
                        {doctor.doctorCode}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/doctors/${doctor.id}`)}>
                        Dr. {doctor.user.firstName} {doctor.user.lastName}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/doctors/${doctor.id}`)}>
                        {doctor.specialization}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/doctors/${doctor.id}`)}>
                        {doctor.qualification}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/doctors/${doctor.id}`)}>
                        {doctor.experienceYears} yrs
                      </TableCell>
                      <TableCell onClick={() => navigate(`/doctors/${doctor.id}`)}>
                        {formatFee(doctor.consultationFee)}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/doctors/${doctor.id}`)}>
                        <Badge variant={doctor.isActive ? "success" : "secondary"}>
                          {doctor.isActive ? "Active" : "Inactive"}
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
                              <Link to={`/doctors/${doctor.id}`}>View</Link>
                            </DropdownMenuItem>
                            {isAdmin ? (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link to={`/doctors/${doctor.id}/edit`}>Edit</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    setDoctorToDeactivate({
                                      id: doctor.id,
                                      name: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
                                    })
                                  }
                                >
                                  Deactivate
                                </DropdownMenuItem>
                              </>
                            ) : null}
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

      {doctorToDeactivate ? (
        <ConfirmDeactivateDialog
          doctorName={doctorToDeactivate.name}
          isDeactivating={deactivateDoctor.isPending}
          onCancel={() => setDoctorToDeactivate(null)}
          onConfirm={handleDeactivateConfirm}
        />
      ) : null}
    </div>
  );
}

function ConfirmDeactivateDialog({
  doctorName,
  isDeactivating,
  onCancel,
  onConfirm,
}: {
  doctorName: string;
  isDeactivating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  React.useEffect(() => {
    if (isDeactivating) {
      toast.loading("Deactivating doctor...", { id: "deactivate-doctor" });
    } else {
      toast.dismiss("deactivate-doctor");
    }
  }, [isDeactivating]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Deactivate doctor?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will deactivate <span className="font-medium text-foreground">{doctorName}</span>
            &apos;s profile and login access. This action can be reversed by a clinic admin later.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isDeactivating}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={isDeactivating}>
              {isDeactivating ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
