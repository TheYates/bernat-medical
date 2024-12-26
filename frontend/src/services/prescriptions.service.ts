import { api } from '@/lib/api';

export interface Drug {
  id: string;
  name: string;
  brandName: string;
  form: string;
  strength: string;
  salePricePerUnit: number;
  saleQuantity: number;
  minimumStock: number;
}

export interface Prescription {
  id: string;
  drugs: {
    drug: Drug;
    dosage: string;
    frequency: string;
    duration: number;
    route: string;
    quantity: number;
  }[];
  instructions?: string;
  status: 'pending' | 'dispensed';
  prescribedAt: string;
  prescribedBy: {
    firstName: string;
    lastName: string;
  };
}

export const prescriptionsService = {
  searchDrugs: async (query: string) => {
    const response = await api.get(`/drugs/search?q=${query}`);
    return response.data;
  },

  getHistory: async (patientId: string) => {
    const response = await api.get(`/prescriptions/${patientId}/history`);
    return response.data;
  },

  create: async (patientId: string, data: any) => {
    const response = await api.post(`/prescriptions/${patientId}`, data);
    return response.data;
  },

  delete: async (prescriptionId: string) => {
    await api.delete(`/prescriptions/${prescriptionId}`);
  }
}; 