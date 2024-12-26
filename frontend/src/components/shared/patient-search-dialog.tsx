import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { Patient } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { calculateAge } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface PatientSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (patient: Patient) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  searchResults: Patient[];
  onClearSearch: () => void;
}

export function PatientSearchDialog({
  open,
  onOpenChange,
  onSelect,
  searchTerm,
  onSearchTermChange,
  searchResults,
  onClearSearch,
}: PatientSearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Search Patient</DialogTitle>
          <DialogDescription>Quick search by name or contact</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Search by name or contact..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="w-full pr-8"
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={onClearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {patient.firstName} {patient.middleName}{" "}
                            {patient.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {patient.clinicId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(patient.dateOfBirth), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {calculateAge(patient.dateOfBirth)}y
                      </TableCell>
                      <TableCell>{patient.gender}</TableCell>
                      <TableCell>{patient.contact}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => onSelect(patient)}>
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
