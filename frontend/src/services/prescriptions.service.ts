import { api } from '@/lib/api';

export interface Drug {
  id: string;
  genericName: string;
  brandName?: string;
  strength: string;
  form: string;
  saleQuantity: number;
  minimumStock: number;
  salePricePerUnit: number;
  active: boolean;
}

export interface PrescriptionItem {
  id: string;
  drugId: string;
  drug: Drug;
  prescriptionId: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: number;
  salePricePerUnit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  prescribedAt: string;
  status: 'pending' | 'dispensed';
  items: PrescriptionItem[];
  instructions?: string;
  dispensedAt?: string;
  dispensedBy?: {
    fullName: string;
  };
}

export const prescriptionsService = {
  getHistory: async (patientId: string) => {
    const response = await api.get(`/prescriptions/${patientId}/history`);
    return response.data;
  },

  create: async (patientId: string, data: {
    items: Array<{
      drugId: string;
      dosage: string;
      frequency: string;
      duration: string;
      route: string;
      quantity: number;
    }>;
    instructions?: string;
  }) => {
    const response = await api.post(`/prescriptions/${patientId}`, data);
    return response.data;
  },

  delete: async (prescriptionId: string) => {
    await api.delete(`/prescriptions/${prescriptionId}`);
  }
}; 