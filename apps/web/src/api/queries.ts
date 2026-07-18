import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Session } from './client.js';

export const meKey = ['me'] as const;

export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: api.me, retry: false });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => api.login(username),
    onSuccess: (session: Session) => qc.setQueryData(meKey, session),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.setQueryData(meKey, null);
      qc.clear();
    },
  });
}

const CURRENT_YEAR = new Date().getFullYear();

export function useCourses(year: number = CURRENT_YEAR) {
  return useQuery({ queryKey: ['courses', year], queryFn: () => api.courses(year) });
}

export function useCourse(id: number) {
  return useQuery({ queryKey: ['course', id], queryFn: () => api.course(id) });
}

export function useCourseSessions(id: number) {
  return useQuery({ queryKey: ['course', id, 'sessions'], queryFn: () => api.courseSessions(id) });
}

export function useCourseParticipants(id: number, enabled = true) {
  return useQuery({
    queryKey: ['course', id, 'participants'],
    queryFn: () => api.courseParticipants(id),
    enabled,
  });
}

export function useEmployees(query?: string) {
  return useQuery({ queryKey: ['employees', query ?? ''], queryFn: () => api.employees(query) });
}

export function useEmployee(id: string) {
  return useQuery({ queryKey: ['employee', id], queryFn: () => api.employee(id) });
}

export function useEmployeeHistory(id: string) {
  return useQuery({
    queryKey: ['employee', id, 'history'],
    queryFn: () => api.employeeHistory(id),
  });
}

export function useMyTraining(year: number = CURRENT_YEAR) {
  return useQuery({ queryKey: ['me', 'training', year], queryFn: () => api.myTraining(year) });
}

export function useCompliance(
  scope: 'team' | 'organization',
  year: number = CURRENT_YEAR,
  enabled = true,
) {
  return useQuery({
    queryKey: ['reports', 'compliance', scope, year],
    queryFn: () => api.compliance(scope, year),
    enabled,
  });
}

export function useBudget(year: number = CURRENT_YEAR, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'budget', year],
    queryFn: () => api.budget(year),
    enabled,
  });
}

export function useAttendance(
  scope: 'team' | 'organization',
  year: number = CURRENT_YEAR,
  enabled = true,
) {
  return useQuery({
    queryKey: ['reports', 'attendance', scope, year],
    queryFn: () => api.attendance(scope, year),
    enabled,
  });
}

export function useTeamDevelopment(
  scope: 'team' | 'organization',
  year: number = CURRENT_YEAR,
  enabled = true,
) {
  return useQuery({
    queryKey: ['reports', 'development', scope, year],
    queryFn: () => api.teamDevelopment(scope, year),
    enabled,
  });
}

export function useGoals(year: number = CURRENT_YEAR, enabled = true) {
  return useQuery({
    queryKey: ['goals', year],
    queryFn: () => api.goals(year),
    enabled,
  });
}

export function useSetGoals(year: number = CURRENT_YEAR) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goals: { discipline: string; targetHours: number }[]) => api.setGoals(year, goals),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] });
      void qc.invalidateQueries({ queryKey: ['reports'] });
      void qc.invalidateQueries({ queryKey: ['me', 'training'] });
    },
  });
}

export function useCourseAvailability(id: number, enabled = true) {
  return useQuery({
    queryKey: ['course', id, 'availability'],
    queryFn: () => api.courseAvailability(id),
    enabled,
  });
}

export function useCourseRoster(id: number, enabled = true) {
  return useQuery({
    queryKey: ['course', id, 'roster'],
    queryFn: () => api.courseRoster(id),
    enabled,
  });
}

/** Invalidate everything tied to a course's registration state after a write. */
function useCourseRefetch(courseId: number) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['course', courseId] });
    void qc.invalidateQueries({ queryKey: ['reports'] });
  };
}

export function useRegister(courseId: number) {
  const refetch = useCourseRefetch(courseId);
  return useMutation({
    mutationFn: (vars: { employeeId: string; source: 'hr' | 'manager' | 'self' }) =>
      api.register(courseId, vars.employeeId, vars.source),
    onSuccess: refetch,
  });
}

export function useManageRegistration(courseId: number) {
  const refetch = useCourseRefetch(courseId);
  return useMutation({
    mutationFn: (vars: { employeeId: string; action: 'approve' | 'decline' | 'cancel' }) =>
      api.manageRegistration(courseId, vars.employeeId, vars.action),
    onSuccess: refetch,
  });
}

// ---- Quarterly cycle workflow ----

export function useCycleBoard(cycleId?: number) {
  return useQuery({
    queryKey: ['cycle', 'board', cycleId ?? 0],
    queryFn: () => api.cycleBoard(cycleId),
  });
}

export function useCourseBids(courseId: number, enabled = true) {
  return useQuery({
    queryKey: ['course', courseId, 'bids'],
    queryFn: () => api.courseBids(courseId),
    enabled,
  });
}

export function useCycleActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['cycle'] });
    void qc.invalidateQueries({ queryKey: ['course'] });
    void qc.invalidateQueries({ queryKey: ['courses'] });
  };
  return {
    setBid: useMutation({
      mutationFn: (v: { courseId: number; seats: number }) => api.setBid(v.courseId, v.seats),
      onSuccess: invalidate,
    }),
    openBidding: useMutation({
      mutationFn: (v: { cycleId: number; biddingClosesAt: string; courseIds: number[] }) =>
        api.openBidding(v.cycleId, v.biddingClosesAt, v.courseIds),
      onSuccess: invalidate,
    }),
    openRegistration: useMutation({
      mutationFn: (v: { cycleId: number; registrationClosesAt: string; courseIds: number[] }) =>
        api.openRegistration(v.cycleId, v.registrationClosesAt, v.courseIds),
      onSuccess: invalidate,
    }),
    lock: useMutation({
      mutationFn: (cycleId: number) => api.lockCycle(cycleId),
      onSuccess: invalidate,
    }),
    decide: useMutation({
      mutationFn: (v: { courseId: number; decision: 'confirm' | 'cancel' }) =>
        api.decideCourse(v.courseId, v.decision),
      onSuccess: invalidate,
    }),
  };
}

// ---- Notification outbox ----

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: api.notifications });
}

export function useNotificationsUnread() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: api.notificationsUnread,
    refetchInterval: 60_000,
  });
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['notifications'] });
  return {
    markRead: useMutation({
      mutationFn: (id: number) => api.markNotificationRead(id),
      onSuccess: invalidate,
    }),
    markAllRead: useMutation({
      mutationFn: () => api.markAllNotificationsRead(),
      onSuccess: invalidate,
    }),
    dispatch: useMutation({ mutationFn: () => api.dispatchNotifications(), onSuccess: invalidate }),
  };
}

// ---- Per-day attendance & justifications ----

export function useAttendanceGrid(courseId: number, enabled = true) {
  return useQuery({
    queryKey: ['course', courseId, 'attendance-grid'],
    queryFn: () => api.attendanceGrid(courseId),
    enabled,
  });
}

export function useMarkAttendance(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { employeeId: string; sessionStart: string; present: boolean }) =>
      api.markAttendance(courseId, v.employeeId, v.sessionStart, v.present),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['course', courseId, 'attendance-grid'] });
      void qc.invalidateQueries({ queryKey: ['justifications'] });
    },
  });
}

export function useJustifications() {
  return useQuery({ queryKey: ['justifications'], queryFn: api.justifications });
}

export function useJustificationActions() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['justifications'] });
  return {
    submit: useMutation({
      mutationFn: (v: { id: number; reason: string }) => api.submitJustification(v.id, v.reason),
      onSuccess: invalidate,
    }),
    review: useMutation({
      mutationFn: (v: { id: number; decision: 'accept' | 'reject' }) =>
        api.reviewJustification(v.id, v.decision),
      onSuccess: invalidate,
    }),
  };
}
