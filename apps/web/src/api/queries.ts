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
