import { api } from '@/lib/api';

export interface Investigation {
  id: string;
  createdAt: string;
  service: {
    id: string;
    name: string;
    category: string;
  };
  result?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  performedBy?: {
    fullName: string;
  };
}

export const investigationsService = {
  getHistory: async (patientId: string) => {
    const response = await api.get(`/lab-requests/${patientId}/history`);
    return response.data;
  },

  create: async (patientId: string, serviceIds: string[]) => {
    const response = await api.post(`/lab-requests/${patientId}`, {
      services: serviceIds
    });
    return response.data;
  },

  delete: async (requestId: string) => {
    await api.delete(`/lab-requests/${requestId}`);
  }
}; 