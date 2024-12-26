import { api } from '@/lib/api';

export interface Diagnosis {
  id: string;
  name: string;
  code?: string;
  category?: string;
}

export const diagnosisService = {
  search: async (query: string) => {
    const response = await api.get(`/diagnoses/search?q=${query}`);
    return response.data;
  },

  getCommon: async () => {
    const response = await api.get('/diagnoses/common');
    return response.data;
  }
}; 