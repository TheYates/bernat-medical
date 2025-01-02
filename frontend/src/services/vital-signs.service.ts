import { api } from "@/lib/api";

export interface VitalSigns {
  id: string;
  temperatureC: number;
  temperatureF: number;
  systolic: number;
  diastolic: number;
  pulseRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  weight: number;
  height: number;
  fbs?: number;
  rbs?: number;
  fhr?: number;
  recordedBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export const vitalSignsService = {
  getHistory: async (patientId: string) => {
    const response = await api.get(`/vitals/${patientId}`);
    return response.data;
  },

  getToday: async (patientId: string) => {
    const response = await api.get(`/vitals/${patientId}/today`);
    return response.data;
  },
};
