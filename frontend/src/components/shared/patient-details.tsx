import { Patient } from "@/types/patient";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { calculateAge } from "@/lib/utils";

interface PatientDetailsProps {
  patient: Patient | null;
  showPrintButton?: boolean;
  onPrint?: () => void;
}

export function PatientDetails({
  patient,
  showPrintButton = false,
  onPrint,
}: PatientDetailsProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 bg-muted/30 rounded-md p-4">
        <div className="space-y-1 text-center">
          <label className="text-sm font-medium text-foreground/70">Name</label>
          <p className="text-lg font-medium">
            {patient
              ? `${patient.firstName} ${patient.middleName} ${patient.lastName}`
              : "-"}
          </p>
        </div>

        <div className="space-y-1 text-center">
          <label className="text-sm font-medium text-foreground/70">Age</label>
          <p className="text-lg font-medium">
            {patient ? calculateAge(patient.dateOfBirth) : "-"}
          </p>
        </div>

        <div className="space-y-1 text-center">
          <label className="text-sm font-medium text-foreground/70">
            Gender
          </label>
          <p className="text-lg font-medium">{patient?.gender || "-"}</p>
        </div>

        <div className="col-span-3 grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-1 text-center">
            <label className="text-sm font-medium text-foreground/70">
              Date
            </label>
            <p className="text-lg font-medium">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>

          <div className="space-y-1 text-center">
            <label className="text-sm font-medium text-foreground/70">
              Time
            </label>
            <p className="text-lg font-medium">
              {format(new Date(), "hh:mm a")}
            </p>
          </div>
        </div>
      </div>

      {showPrintButton && patient && onPrint && (
        <div className="flex justify-end mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="text-xs"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print ID Card
          </Button>
        </div>
      )}
    </>
  );
}
