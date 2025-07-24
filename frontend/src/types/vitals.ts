export interface VitalSigns {
  id: string;
  patientId: number;
  systolic: number;
  diastolic: number;
  temperatureC: number;
  temperatureF: number;
  pulseRate: number;
  respiratoryRate: number;
  weight?: number;
  height?: number;
  oxygenSaturation: number;
  fbs?: number;
  rbs?: number;
  fhr?: number;
  createdAt: string;
  recordedBy: {
    firstName: string;
    lastName: string;
  };
}

export interface VitalSignsFormData {
  clinicId: string;
  systolic: string;
  diastolic: string;
  temperatureC: string;
  temperatureF: string;
  pulseRate: string;
  respiratoryRate: string;
  weight?: string;
  height?: string;
  oxygenSaturation?: string;
  fbs?: string;
  rbs?: string;
  fhr?: string;
}
