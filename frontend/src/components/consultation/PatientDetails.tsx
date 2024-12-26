interface PatientDetailsProps {
  patient: any;
}

export function PatientDetails({ patient }: PatientDetailsProps) {
  if (!patient) return null;

  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-medium">
            {patient.firstName} {patient.lastName}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Age</p>
          <p className="font-medium">{patient.age} years</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Gender</p>
          <p className="font-medium">{patient.gender}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="font-medium">{patient.phone}</p>
        </div>
      </div>
    </div>
  );
} 