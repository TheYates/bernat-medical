import { VitalSigns } from "./vitals";

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
  serviceRequestId?: number;
  todayVitalSigns?: VitalSigns | null;
}
