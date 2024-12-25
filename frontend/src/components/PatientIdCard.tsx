import { format } from "date-fns";
import { Patient } from "@/types/patient";
import logo from "@/assets/bernat medical with.svg";

interface PatientIdCardProps {
  patient: Patient;
  calculateAge: (dob: string) => number;
}

export function PatientIdCard({ patient, calculateAge }: PatientIdCardProps) {
  return (
    <div id="printable-card" className="hidden print:block">
      <div 
        className="border rounded-lg p-4 mx-auto bg-white"
        style={{
          width: "85.6mm",
          height: "53.98mm",
          pageBreakInside: "avoid",
        }}
      >
        <div className="text-center mb-3">
          <img src={logo} alt="Bernat Medical Center" className="h-8 mx-auto mb-2" />
          <h2 className="font-bold text-sm">Patient ID Card</h2>
        </div>
        
        <div className="space-y-2 text-[10px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-medium text-muted-foreground">Clinic ID</p>
              <p className="font-semibold">{patient.clinicId}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Name</p>
              <p className="font-semibold truncate">
                {patient.firstName} {patient.middleName} {patient.lastName}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="font-medium text-muted-foreground">Gender</p>
              <p className="font-semibold">{patient.gender}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Age</p>
              <p className="font-semibold">{calculateAge(patient.dateOfBirth)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Contact</p>
              <p className="font-semibold">{patient.contact}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 