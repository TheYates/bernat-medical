import { api } from '@/lib/api';

export interface Complaint {
  id: string;
  name: string;
  category?: string;
  duration?: string;
}

export const complaintsService = {
  search: async (query: string) => {
    const response = await api.get(`/complaints/search?q=${query}`);
    return response.data;
  },

  getCommon: async () => {
    const response = await api.get('/complaints/common');
    return response.data;
  }
}; 