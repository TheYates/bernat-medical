import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Automatically attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
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
