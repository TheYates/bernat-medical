import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Search, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { calculateAge } from "@/lib/utils";
import { toast } from "sonner";
import type { Patient } from "@/types/patient";
import { EditPatientForm } from "../patients/EditPatientForm";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type SortField =
  | "clinicId"
  | "firstName"
  | "dateOfBirth"
  | "gender"
  | "contact"
  | "maritalStatus"
  | "residence"
  | "emergencyContactName"
  | "registeredAt";
type SortOrder = "asc" | "desc";

export function PatientManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [gender, setGender] = useState("any");
  const [maritalStatus, setMaritalStatus] = useState("any");
  const [sortField, setSortField] = useState<SortField>("clinicId");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["patients", searchTerm, gender, maritalStatus, page],
    queryFn: async () => {
      const response = await api.get("/patients/search", {
        params: {
          searchTerm,
          gender,
          maritalStatus,
          page,
          pageSize,
        },
      });
      setTotalPages(Math.ceil(response.data.total / pageSize));
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (clinicId: string) => {
      await api.delete(`/patients/${clinicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted successfully");
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      console.error("Error deleting patient:", error);
      toast.error("Failed to delete patient");
    },
  });

  const handleDelete = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDeleteDialog(true);
  };

  const handleEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    toast.success("Patient updated successfully");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedPatients = data?.patients?.sort((a: Patient, b: Patient) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (sortField === "firstName") {
      const aName = `${a.firstName} ${a.lastName}`;
      const bName = `${b.firstName} ${b.lastName}`;
      return sortOrder === "asc"
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    }

    return sortOrder === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Gender</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
        <Select value={maritalStatus} onValueChange={setMaritalStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Marital status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Status</SelectItem>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="married">Married</SelectItem>
            <SelectItem value="divorced">Divorced</SelectItem>
            <SelectItem value="widowed">Widowed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                onClick={() => handleSort("clinicId")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  Clinic ID
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("firstName")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  Name
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("dateOfBirth")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  Age
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("gender")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  Gender
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("contact")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  Contact
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("maritalStatus")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  Marital Status
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("residence")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  Residence
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Emergency Contact</TableHead>
              <TableHead
                onClick={() => handleSort("registeredAt")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  Registered
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sortedPatients?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No patients found
                </TableCell>
              </TableRow>
            ) : (
              sortedPatients?.map((patient: Patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    {patient.clinicId}
                  </TableCell>
                  <TableCell>
                    {patient.firstName} {patient.middleName} {patient.lastName}
                  </TableCell>
                  <TableCell>{calculateAge(patient.dateOfBirth)}</TableCell>
                  <TableCell>{patient.gender}</TableCell>
                  <TableCell>{patient.contact}</TableCell>
                  <TableCell>{patient.maritalStatus}</TableCell>
                  <TableCell>{patient.residence || "-"}</TableCell>
                  <TableCell>
                    {patient.emergencyContactName ? (
                      <div className="text-sm">
                        <div>{patient.emergencyContactName}</div>
                        <div className="text-muted-foreground">
                          {patient.emergencyContactNumber} (
                          {patient.emergencyContactRelation})
                        </div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {format(
                      new Date(patient.registeredAt),
                      "d MMM yyyy"
                    ).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(patient)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(patient)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ←
              </Button>
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  onClick={() => setPage(p)}
                  isActive={page === p}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                →
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this patient? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(selectedPatient?.clinicId!)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Patient Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <EditPatientForm
              patient={selectedPatient}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
