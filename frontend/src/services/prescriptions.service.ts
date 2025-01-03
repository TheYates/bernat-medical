import { api } from "@/lib/api";

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
  createdAt: string;
  status: "pending" | "dispensed";
  drug: {
    id: string;
    genericName: string;
    strength: string;
  };
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: number;
}

export const prescriptionsService = {
  getHistory: async (patientId: string) => {
    const response = await api.get(`/prescriptions/${patientId}/history`);
    return response.data;
  },

  create: async (
    patientId: string,
    data: {
      items: Array<{
        drugId: string;
        dosage: string;
        frequency: string;
        duration: string;
        route: string;
        quantity: number;
      }>;
      instructions?: string;
    }
  ) => {
    const response = await api.post(`/prescriptions/${patientId}`, data);
    return response.data;
  },

  delete: async (prescriptionId: string) => {
    await api.delete(`/prescriptions/${prescriptionId}`);
  },

  getDrugs: async (): Promise<Drug[]> => {
    const response = await api.get("/drugs");
    return response.data;
  },

  createPrescriptionOnly: async (
    patientId: string,
    data: {
      items: Array<{
        drugId: string;
        dosage: string;
        frequency: string;
        duration: string;
        route: string;
        quantity: number;
      }>;
      instructions?: string;
    }
  ) => {
    const response = await api.post(`/prescriptions/${patientId}/only`, data);
    return response.data;
  },
};
