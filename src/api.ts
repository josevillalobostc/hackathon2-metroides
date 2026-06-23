import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Prevent Axios from adding charset=utf-8 which can break strict OpenAPI parsers
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// Auto-logout on 401: clears stale token and redirects to login
// so expired tokens never produce cryptic "Error al actualizar" messages.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Hard redirect so the AuthProvider re-reads localStorage on mount
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
