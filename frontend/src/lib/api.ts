import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Add request interceptor to attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  // console.log('Making request with token:', token?.substring(0, 20) + '...');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    // console.log('API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    // console.error('API Error:', {
    //   url: error.config?.url,
    //   status: error.response?.status,
    //   data: error.response?.data
    // });
    return Promise.reject(error);
  }
);
