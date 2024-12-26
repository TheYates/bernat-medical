import { api } from '@/lib/api';

export interface Treatment {
  id: string;
  name: string;
  category?: string;
  instructions?: string;
}

export const treatmentService = {
  search: async (query: string) => {
    const response = await api.get(`/treatments/search?q=${query}`);
    return response.data;
  },

  getCommon: async () => {
    const response = await api.get('/treatments/common');
    return response.data;
  }
}; 