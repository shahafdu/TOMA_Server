import type {
  AttendanceGrid,
  AttendanceJustification,
  AttendanceReport,
  BudgetReport,
  ComplianceReport,
  Course,
  CourseAvailability,
  CourseBid,
  CourseRoster,
  CourseSession,
  CycleBoard,
  Employee,
  EmployeeSummary,
  MyTraining,
  NotificationMessage,
  PriorParticipation,
  RegistrationResult,
  Role,
  TrainingCycle,
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
  hasTeam: boolean;
}

export type ComplianceScope = 'team' | 'organization';

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
  manageRegistration: (
    courseId: number,
    employeeId: string,
    action: 'approve' | 'decline' | 'cancel',
  ) =>
    request<{ status: string }>('PATCH', `/courses/${courseId}/registrations/${employeeId}`, {
      action,
    }),
  courseAvailability: (id: number) =>
    request<CourseAvailability>('GET', `/courses/${id}/availability`),
  courseRoster: (id: number) => request<CourseRoster>('GET', `/courses/${id}/roster`),

  myTraining: (year: number) => request<MyTraining>('GET', `/me/training?year=${year}`),
  compliance: (scope: ComplianceScope, year: number) =>
    request<ComplianceReport>('GET', `/reports/compliance?scope=${scope}&year=${year}`),
  budget: (year: number) => request<BudgetReport>('GET', `/reports/budget?year=${year}`),
  attendance: (scope: ComplianceScope, year: number) =>
    request<AttendanceReport>('GET', `/reports/attendance?scope=${scope}&year=${year}`),

  // ---- Quarterly cycle workflow ----
  cycleBoard: (cycleId?: number) =>
    request<CycleBoard | null>('GET', `/cycles/board${cycleId ? `?cycleId=${cycleId}` : ''}`),
  setBid: (courseId: number, seats: number) =>
    request<void>('POST', `/courses/${courseId}/bid`, { seats }),
  courseBids: (courseId: number) => request<CourseBid[]>('GET', `/courses/${courseId}/bids`),
  openBidding: (cycleId: number, biddingClosesAt: string, courseIds: number[]) =>
    request<TrainingCycle>('POST', `/cycles/${cycleId}/open-bidding`, {
      biddingClosesAt,
      courseIds,
    }),
  openRegistration: (cycleId: number, registrationClosesAt: string, courseIds: number[]) =>
    request<TrainingCycle>('POST', `/cycles/${cycleId}/open-registration`, {
      registrationClosesAt,
      courseIds,
    }),
  lockCycle: (cycleId: number) => request<TrainingCycle>('POST', `/cycles/${cycleId}/lock`),
  decideCourse: (courseId: number, decision: 'confirm' | 'cancel') =>
    request<{ state: string }>('POST', `/courses/${courseId}/decision`, { decision }),

  // ---- Notification outbox ----
  notifications: () => request<NotificationMessage[]>('GET', '/notifications'),
  notificationsUnread: () => request<{ count: number }>('GET', '/notifications/unread-count'),
  markNotificationRead: (id: number) => request<void>('POST', `/notifications/${id}/read`),
  markAllNotificationsRead: () => request<void>('POST', '/notifications/read-all'),
  dispatchNotifications: () => request<{ dispatched: number }>('POST', '/notifications/dispatch'),

  // ---- Per-day attendance & justifications ----
  attendanceGrid: (courseId: number) =>
    request<AttendanceGrid>('GET', `/courses/${courseId}/attendance-grid`),
  markAttendance: (courseId: number, employeeId: string, sessionStart: string, present: boolean) =>
    request<void>('PUT', `/courses/${courseId}/attendance`, { employeeId, sessionStart, present }),
  justifications: () => request<AttendanceJustification[]>('GET', '/justifications'),
  submitJustification: (id: number, reason: string) =>
    request<AttendanceJustification>('POST', `/justifications/${id}/submit`, { reason }),
  reviewJustification: (id: number, decision: 'accept' | 'reject') =>
    request<AttendanceJustification>('POST', `/justifications/${id}/review`, { decision }),
};
