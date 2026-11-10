import axios from 'axios';
import mockAdapter from './mockApi';

const TOKEN_KEY = 'sweety_token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode) – session just won't persist */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
// Hosted preview only: answer API calls in the browser instead of hitting a server
if (import.meta.env.VITE_MOCK) api.defaults.adapter = mockAdapter;

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isCredentialCall = /\/auth\/(login|register)/.test(url);
    if (err.response?.status === 401 && !isCredentialCall) {
      tokenStore.clear();
      window.dispatchEvent(new Event('sweety:unauthorized'));
    }
    return Promise.reject(err);
  }
);

/** Human-friendly message from an axios error. */
export function errorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request) return 'Cannot reach the server. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

/** Which form field the server complained about (if any). */
export function errorField(err) {
  return err?.response?.data?.field;
}

export default api;
