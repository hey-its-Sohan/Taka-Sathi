import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'takasathi_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const http = axios.create({ baseURL: BASE_URL, timeout: 40000 });

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap the backend's { success, message, data } envelope so callers just
// get `data` back directly, and throw a normalized Error otherwise.
http.interceptors.response.use(
  (res) => res.data?.data,
  (err) => {
    if (err.response?.status === 401) {
      tokenStore.clear();
      // Hard redirect rather than router push — keeps this file router-agnostic
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    const message =
      err.response?.data?.message ||
      (Array.isArray(err.response?.data?.error)
        ? err.response.data.error.map((e) => e.message).join(', ')
        : err.response?.data?.error) ||
      err.message ||
      'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

/* ---------------------------- Auth ---------------------------- */
export const authApi = {
  requestOtp: (phoneNumber) => http.post('/auth/request-otp', { phoneNumber }),
  verifyOtp: (phoneNumber, otp) => http.post('/auth/verify-otp', { phoneNumber, otp }),
  getMe: () => http.get('/auth/me'),
  updateProfile: (payload) => http.put('/auth/profile', payload),
};

/* ------------------------ Transactions ------------------------- */
export const transactionsApi = {
  list: (params = {}) => http.get('/transactions', { params }),
  create: (payload) => http.post('/transactions', payload),
  update: (id, payload) => http.put(`/transactions/${id}`, payload),
  remove: (id) => http.delete(`/transactions/${id}`),
};

/* -------------------------- Insights ---------------------------- */
export const insightsApi = {
  generateSummary: (periodType = 'weekly') => http.post('/insights/summary', { periodType }),
  getLatest: (periodType = 'weekly') => http.get('/insights/latest', { params: { periodType } }),
};

/* ---------------------------- Loans ------------------------------ */
export const loansApi = {
  getProducts: () => http.get('/loans/products'),
  checkEligibility: () => http.post('/loans/check-eligibility'),
};

/* -------------------------- Dashboard ----------------------------- */
export const dashboardApi = {
  getOverview: () => http.get('/dashboard/overview'),
};

export default http;
