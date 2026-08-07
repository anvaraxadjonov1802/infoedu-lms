import type { LMSLocalState } from './lmsService';
import type { TestResult, UserProfile, UserRole } from '../types/lms';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const normalizedApiUrl = rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')
  ? rawApiUrl
  : `https://${rawApiUrl}`;
const API_BASE_URL = `${normalizedApiUrl.replace(/\/$/, '')}${/\/api$/.test(normalizedApiUrl.replace(/\/$/, '')) ? '' : '/api'}`;
const ACCESS_KEY = 'infoedu_access_token';
const REFRESH_KEY = 'infoedu_refresh_token';

export interface LoginResponse {
  access: string;
  refresh: string;
  user: UserProfile;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  university?: string;
  faculty?: string;
  groupName?: string;
  studentId?: string;
  password: string;
  passwordConfirm: string;
}

export interface RegisterResponse {
  detail: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'student';
  };
}

export interface SubmitTestPayload {
  answers: Record<string, unknown>;
  flaggedQuestionIds?: string[];
  timeSpentSeconds: number;
}

export interface AdminStudentRow {
  id: string; fullName: string; studentId: string; group: string; faculty: string;
  activeCourses: number; averageScore: number; status: 'active' | 'inactive';
}

export interface AdminAnnouncementRow {
  id: string; title: string; message: string; date: string; time: string; isRead: boolean; type: string;
}

export interface AdminStatsResponse {
  totalStudents: number; activeStudents: number; totalCourses: number; submittedTests: number;
  averageScore: number; students: AdminStudentRow[]; announcements: AdminAnnouncementRow[];
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

function saveTokens(access: string, refresh: string, remember = true) {
  // JWTs are deliberately kept in localStorage for this SPA deployment model.
  // If frontend/backend are later hosted on one parent domain, move refresh tokens
  // to HttpOnly Secure cookies for stronger XSS resistance.
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(ACCESS_KEY, access);
  storage.setItem(REFRESH_KEY, refresh);
  if (remember) {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } else {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

function readToken(key: string) {
  return sessionStorage.getItem(key) || localStorage.getItem(key);
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text();
  return text ? { detail: text } : null;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = readToken(REFRESH_KEY) || getRefreshToken();
  if (!refresh) return null;

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = await response.json();
  const remember = Boolean(localStorage.getItem(REFRESH_KEY));
  saveTokens(data.access, data.refresh || refresh, remember);
  return data.access;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = readToken(ACCESS_KEY) || getAccessToken();
  const headers = new Headers(init.headers || {});

  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Server bilan bog‘lanib bo‘lmadi. Internet yoki API manzilini tekshiring.', 0, null);
  }

  if (response.status === 401 && retry && readToken(REFRESH_KEY)) {
    const access = await refreshAccessToken();
    if (access) return request<T>(path, init, false);
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    const message = (data as { detail?: string })?.detail || 'So‘rov bajarilmadi.';
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

export const api = {
  hasSession: () => Boolean(readToken(ACCESS_KEY) || readToken(REFRESH_KEY)),
  clearSession: clearTokens,

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    return request<RegisterResponse>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  async logout(): Promise<void> {
    const refresh = readToken(REFRESH_KEY);
    try {
      if (refresh) await request('/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh }) }, false);
    } finally {
      clearTokens();
    }
  },

  async login(email: string, password: string, remember = true): Promise<LoginResponse> {
    const data = await request<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveTokens(data.access, data.refresh, remember);
    return data;
  },

  async demoLogin(role: UserRole): Promise<LoginResponse> {
    const data = await request<LoginResponse>('/auth/demo-login/', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    saveTokens(data.access, data.refresh, false);
    return data;
  },

  bootstrap: () => request<LMSLocalState>('/bootstrap/'),
  updateProfile: (updates: Partial<UserProfile>) => request<UserProfile>('/auth/me/', { method: 'PATCH', body: JSON.stringify(updates) }),
  changePassword: (oldPassword: string, newPassword: string) => request('/auth/change-password/', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) }),
  markLessonCompleted: (lessonId: string) => request<{ ok: boolean; totalStudyMinutes: number }>(`/lessons/${lessonId}/complete/`, { method: 'POST' }),
  updateTheory: (theoryId: string, payload: { notes?: string; isBookmarked?: boolean }) => request(`/theory/${theoryId}/progress/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  updateVideoProgress: (videoId: string, payload: { seconds: number; percentage: number; markCompleted?: boolean }) => request<{ ok: boolean; lastPositionSeconds: number; watchedPercentage: number; isCompleted: boolean; totalStudyMinutes: number }>(`/videos/${videoId}/progress/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  submitTest: (testId: string, payload: SubmitTestPayload) => request<TestResult>(`/tests/${testId}/submit/`, { method: 'POST', body: JSON.stringify(payload) }),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read/`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all/', { method: 'POST' }),
  adminStats: () => request<AdminStatsResponse>('/admin/stats/'),
  createAnnouncement: (title: string, message: string) => request<{ ok: boolean; sent: number }>('/admin/announcements/', { method: 'POST', body: JSON.stringify({ title, message }) }),
};

export { ApiError, API_BASE_URL };
