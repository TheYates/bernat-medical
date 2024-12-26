import { api } from '@/lib/api';

export interface ClinicalNote {
  id: string;
  notes: string;
  createdAt: string;
  recordedBy: {
    firstName: string;
    lastName: string;
  };
}

export const clinicalNotesService = {
  getHistory: async (patientId: string) => {
    const response = await api.get(`/clinical-notes/${patientId}/history`);
    return response.data;
  }
}; 