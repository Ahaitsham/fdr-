import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // httpOnly JWT cookie
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/')) window.location.href = '/login';
    return Promise.reject(err);
  },
);
export const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Something went wrong';
export const fieldErrors = (e: any): Record<string, string> => e?.response?.data?.errors || {};
