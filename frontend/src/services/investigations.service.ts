import { api } from "@/lib/api";

export interface Investigation {
  id: string;
  createdAt: string;
  service: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  result?: string;
  fileUrl?: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  performedBy?: {
    fullName: string;
  };
  requestedBy: {
    username: string;
    fullName: string;
  };
}

export const investigationsService = {
  getHistory: async (patientId: string) => {
    const response = await api.get(`/lab-requests/${patientId}/history`);
    return response.data;
  },

  create: async (data: { patientId: string; serviceId: string | string[] }) => {
    // If serviceId is an array, send multiple requests
    if (Array.isArray(data.serviceId)) {
      const results = await Promise.all(
        data.serviceId.map((id) =>
          api.post("/lab-requests", {
            patientId: data.patientId,
            serviceId: id,
          })
        )
      );
      return results.map((r) => r.data);
    }

    // Single request
    const response = await api.post("/lab-requests", data);
    return response.data;
  },

  delete: async (requestId: string) => {
    await api.delete(`/lab-requests/${requestId}`);
  },
};
