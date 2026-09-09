import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8002';
const COMPANIES_URL = import.meta.env.VITE_COMPANIES_URL || 'http://localhost:8001';
const GRADUATES_URL = import.meta.env.VITE_GRADUATES_URL || 'http://localhost:8003';
const MATCHMAKING_URL = import.meta.env.VITE_MATCHMAKING_URL || 'http://localhost:8005';

// ── Cliente de autenticación ─────────────────────────────────────────────────
export const authApi = axios.create({
  baseURL: `${AUTH_URL}/api/auth`,
  headers: { 'Content-Type': 'application/json' },
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleGlobalError = (error: any) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    // Si ya estamos en login, no recargar la página para que el componente pueda mostrar el error
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  } else if (!error.response || error.response.status >= 500) {
    if (window.location.pathname !== '/mantenimiento') {
      window.location.href = '/mantenimiento';
    }
  }
  return Promise.reject(error);
};

authApi.interceptors.response.use((res) => res, handleGlobalError);

// ── Cliente de empresas/vacantes ─────────────────────────────────────────────
const api = axios.create({
  baseURL: `${COMPANIES_URL}/api/modulo2`,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: adjunta el token JWT a cada request protegida
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: si el backend devuelve 401, limpia sesión y redirige al login
api.interceptors.response.use((res) => res, handleGlobalError);

// API methods para SubProcesos
export const createSubProcess = (applicationId: number, data: any) => 
  api.post(`/applications/${applicationId}/sub-processes`, data);

export const updateSubProcess = (subProcessId: number, data: any) => 
  api.put(`/sub-processes/${subProcessId}`, data);

export const graduatesApi = axios.create({
  baseURL: `${GRADUATES_URL}/api/modulo1`,
  headers: { 'Content-Type': 'application/json' },
});

graduatesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

graduatesApi.interceptors.response.use((res) => res, handleGlobalError);

export const matchmakingApi = axios.create({
  baseURL: `${MATCHMAKING_URL}/matching`,
  headers: { 'Content-Type': 'application/json' },
});

matchmakingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

matchmakingApi.interceptors.response.use((res) => res, handleGlobalError);

// ── Notificaciones de afinidad (Matchmaking) ─────────────────────────────────
export interface MatchNotification {
  id: number;
  graduate_id: number;
  job_offer_id: number;
  score: number;
  is_read: boolean;
  sent_at: string;
  job_title?: string | null;
  company_name?: string | null;
}

export const getNotifications = (graduateId: number, soloNoLeidas = false) =>
  matchmakingApi.get<MatchNotification[]>(`/notifications/${graduateId}`, {
    params: { solo_no_leidas: soloNoLeidas },
  });

export const markNotificationRead = (notificationId: number) =>
  matchmakingApi.patch<MatchNotification>(`/notifications/${notificationId}/leido`);

// ── Notificaciones de sistema (Auth) ─────────────────────────────────────────
export interface AuthNotification {
  id: number;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

export const getAuthNotifications = () =>
  authApi.get<AuthNotification[]>('/notifications');

export const markAuthNotificationRead = (notificationId: number) =>
  authApi.put(`/notifications/${notificationId}/read`);

export default api;