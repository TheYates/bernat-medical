import { VitalSigns } from "@/services/vital-signs.service";

export interface Patient {
  id: string;
  clinicId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  todayVitalSigns?: VitalSigns | null;
  contact: string;
  maritalStatus?: string;
  residence?: string;
  serviceRequestId?: string;
}
