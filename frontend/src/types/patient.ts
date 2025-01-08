import { VitalSigns } from "@/services/vital-signs.service";

export interface Patient {
  id: number;
  clinicId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contact?: string;
  maritalStatus: string;
  residence?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelation?: string;
  registeredAt: string;
}
