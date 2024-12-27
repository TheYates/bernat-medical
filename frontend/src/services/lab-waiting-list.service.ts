import { api } from '@/lib/api';

export interface LabWaitingListItem {
  id: string;
  patient: {
    id: string;
    clinicId: string;
    firstName: string;
    middleName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  };
  service: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  status: string;
  createdAt: string;
}

export const labWaitingListService = {
  getAll: async (): Promise<LabWaitingListItem[]> => {
    const response = await api.get('/lab-requests/waiting-list');
    return response.data;
  },

  updateStatus: async (requestId: string, status: string) => {
    const response = await api.patch(`/lab-requests/${requestId}/status`, { status });
    return response.data;
  }
}; 