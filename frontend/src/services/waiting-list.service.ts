import { api } from "@/lib/api";

export interface WaitingListItem {
  id: string;
  createdAt: string;
  patient: {
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
  };
  status: string;
}

export const waitingListService = {
  getAll: async () => {
    const response = await api.get("/services/requests/waiting-list");
    return response.data;
  },

  updateStatus: async (id: string) => {
    const response = await api.put(`/services/requests/${id}/status`, {
      status: "In Progress",
    });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get("/services/requests/history");
    return response.data;
  },
};
