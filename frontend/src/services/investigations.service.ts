import { api } from '@/lib/api';

export interface Investigation {
  id: string;
  date: string;
  test: string;
  result: string;
  range?: string;
  status: string;
  recordedBy: {
    firstName: string;
    lastName: string;
  };
}

export const investigationsService = {
  getHistory: async (patientId: string) => {
    const response = await api.get(`/investigations/${patientId}/history`);
    return response.data;
  }
}; 