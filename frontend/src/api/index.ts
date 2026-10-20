import axios from 'axios';

// En producción (desplegado), VITE_*_URL no está definida → usar rutas relativas
// que Nginx redirige al backend gateway. En desarrollo, usar puertos directos.
const AUTH_URL      = import.meta.env.VITE_AUTH_URL      ?? '';
const COMPANIES_URL = import.meta.env.VITE_COMPANIES_URL ?? '';
const GRADUATES_URL = import.meta.env.VITE_GRADUATES_URL ?? '';
const MATCHMAKING_URL = import.meta.env.VITE_MATCHMAKING_URL ?? '';

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
  }
  // En arquitectura de microservicios, la indisponibilidad temporal de un servicio
  // (ej. Empresas) no debe expulsar al usuario ni bloquear módulos operativos (ej. Egresados).
  // Los componentes individuales gestionan fallbacks seguros sin redirigir agresivamente.
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
  payload?: any;
  is_read: boolean;
  created_at: string;
}

export const getAuthNotifications = (unreadOnly = false) =>
  authApi.get<AuthNotification[]>('/notifications', { params: { unread_only: unreadOnly } });

export const markAuthNotificationRead = (notificationId: number) =>
  authApi.put(`/notifications/${notificationId}/read`);

export const markAllAuthNotificationsRead = () =>
  authApi.put('/notifications/read-all');

// ── Cliente Dashboard ────────────────────────────────────────────────────────
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL ?? '';
export const dashboardApi = axios.create({
  baseURL: `${DASHBOARD_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

dashboardApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

dashboardApi.interceptors.response.use((res) => res, handleGlobalError);

// ── Búsquedas Guardadas y Alertas (Fase 1) ────────────────────────────────────
export const getSavedSearches = () =>
  graduatesApi.get('/saved-searches');

export const createSavedSearch = (data: { name: string; filters_json: any }) =>
  graduatesApi.post('/saved-searches', data);

export const deleteSavedSearch = (searchId: number) =>
  graduatesApi.delete(`/saved-searches/${searchId}`);

export const getAlertsSettings = () =>
  graduatesApi.get('/profile/alerts-settings');

export const updateAlertsSettings = (data: { job_alerts_enabled?: boolean; alert_min_score?: number }) =>
  graduatesApi.put('/profile/alerts-settings', data);

// ── Parser de CV por Reglas (Fase 3) ─────────────────────────────────────────
export const parseCvPdf = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return graduatesApi.post('/cv/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Mensajería Directa (Fase 4) ──────────────────────────────────────────────
export const getConversations = () =>
  authApi.get('/conversations');

export const getConversation = (conversationId: number) =>
  authApi.get(`/conversations/${conversationId}`);

export const sendConversationMessage = (conversationId: number, body: string) =>
  authApi.post(`/conversations/${conversationId}/messages`, { body });

export const startConversation = (data: { context_type: string; context_id?: number; participant_ids: number[] }) =>
  authApi.post('/conversations', data);

// ── Red de Egresados y Mentoría (Fase 5) ──────────────────────────────────────
export const getAlumniDirectory = (params: any) =>
  graduatesApi.get('/directory', { params });

export const getMentorProfile = () =>
  graduatesApi.get('/mentor-profile');

export const saveMentorProfile = (data: any) =>
  graduatesApi.post('/mentor-profile', data);

export const requestMentorship = (data: { mentor_id: number; message: string; goal?: string }) =>
  graduatesApi.post('/mentorships/request', data);

export const getMentorships = () =>
  graduatesApi.get('/mentorships');

export const updateMentorshipStatus = (requestId: number, status: string) =>
  graduatesApi.put(`/mentorships/${requestId}/status`, { status });

// ── Eventos y Ferias (Fase 6) ────────────────────────────────────────────────
export const getEvents = (params?: any) =>
  api.get('/events', { params });

export const getMyEvents = () =>
  api.get('/events/my-events');

export const getEventDetail = (eventId: number) =>
  api.get(`/events/${eventId}`);

export const createEvent = (data: any) =>
  api.post('/events', data);

export const updateEvent = (eventId: number, data: any) =>
  api.put(`/events/${eventId}`, data);

export const registerToEvent = (eventId: number) =>
  api.post(`/events/${eventId}/register`);

export const cancelEventRegistration = (eventId: number) =>
  api.delete(`/events/${eventId}/register`);

export const getEventRegistrations = (eventId: number) =>
  api.get(`/events/${eventId}/registrations`);

export const getEventIcsUrl = (eventId: number) =>
  `${COMPANIES_URL}/api/modulo2/events/${eventId}/ics`;

// ── Analítica BI y Executive Dashboard (Fase 7) ──────────────────────────────
export const getExecutiveAnalytics = (params?: any) =>
  dashboardApi.get('/dashboard/admin/analytics', { params });

export default api;
