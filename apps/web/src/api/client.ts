import type {
  Course,
  CourseSession,
  Employee,
  EmployeeSummary,
  PriorParticipation,
  RegistrationResult,
  Role,
} from '@toma/shared';

/**
 * Thin typed API client. This is a hand-written stand-in for the orval-generated client
 * (plan T4.3) — same shape, so swapping it in later is mechanical. All calls send the session
 * cookie (`credentials: include`) and surface `application/problem+json` errors as {@link ApiError}.
 */
const BASE = '/api/v1';

export interface Session {
  id: string;
  fullName: string;
  email: string | null;
  role: Role;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    title: string,
    readonly detail?: string,
  ) {
    super(title);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'include' };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, init);

  if (!res.ok) {
    let problem: { title?: string; detail?: string } = {};
    try {
      problem = await res.json();
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, problem.title ?? res.statusText, problem.detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  me: () => request<Session>('GET', '/auth/me'),
  login: (username: string) => request<Session>('POST', '/auth/login', { username }),
  logout: () => request<void>('POST', '/auth/logout'),

  courses: (year: number) => request<Course[]>('GET', `/courses?year=${year}`),
  course: (id: number) => request<Course>('GET', `/courses/${id}`),
  courseSessions: (id: number) => request<CourseSession[]>('GET', `/courses/${id}/sessions`),
  courseParticipants: (id: number) =>
    request<EmployeeSummary[]>('GET', `/courses/${id}/participants`),

  employees: (query?: string) =>
    request<Page<EmployeeSummary>>(
      'GET',
      `/employees?pageSize=200${query ? `&query=${encodeURIComponent(query)}` : ''}`,
    ),
  employee: (id: string) => request<Employee>('GET', `/employees/${id}`),
  employeeHistory: (id: string) => request<PriorParticipation[]>('GET', `/employees/${id}/history`),

  register: (courseId: number, employeeId: string, source: 'hr' | 'manager' | 'self') =>
    request<RegistrationResult>('POST', `/courses/${courseId}/registrations`, {
      employeeId,
      source,
    }),
};
