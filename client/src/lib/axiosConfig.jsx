// lib/axiosConfig.js
import axios from "axios";
import NProgress from "nprogress";

// Base URL setup (Vite environment variable)
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "https://homiqly-test-3av5.onrender.com",
});

let activeRequests = 0;

// Start NProgress
const startLoading = () => {
  if (activeRequests === 0) {
    NProgress.start();
  }
  activeRequests++;
};

// Stop NProgress
const stopLoading = () => {
  activeRequests--;
  if (activeRequests <= 0) {
    NProgress.done();
  }
};

// Helper: Get the correct token
const getAuthToken = () => {
  const pathname = window.location.pathname;

  if (pathname.startsWith("/admin")) {
    return localStorage.getItem("adminToken");
  }

  if (pathname.startsWith("/vendor")) {
    return localStorage.getItem("vendorToken");
  }

  if (pathname.startsWith("/employees")) {
    return localStorage.getItem("employeesToken");
  }

  // Priority: admin > vendor
  if (adminToken) return adminToken;
  if (vendorToken) return vendorToken;
  if (employeesToken) return employeesToken;

  return null;
};

// Request interceptor: Add token
api.interceptors.request.use(
  (config) => {
    startLoading();

    const token = getAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    stopLoading();
    return Promise.reject(error);
  }
);

// Response interceptor: stop loading
api.interceptors.response.use(
  (response) => {
    stopLoading();
    return response;
  },
  (error) => {
    stopLoading();

    if (error.response?.status === 401) {
      console.warn("Unauthorized - token might be expired or missing");
      // optionally handle logout here
    }

    return Promise.reject(error);
  }
);

export default api;
