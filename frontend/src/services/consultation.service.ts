import { api } from '@/lib/api';

export interface ConsultationHistory {
  id: string;
  complaints: string;
  clinicalNotes?: string;
  diagnosis: string;
  treatment: string;
  createdAt: string;
  recordedBy: {
    firstName: string;
    lastName: string;
  };
}

export const consultationService = {
  getHistory: async (patientId: string) => {
    const response = await api.get(`/consultations/${patientId}/history`);
    return response.data;
  },

  create: async (patientId: string, data: any) => {
    const response = await api.post(`/consultations/${patientId}`, data);
    return response.data;
  }
}; 