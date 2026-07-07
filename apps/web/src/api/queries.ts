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
    onSuccess: () => qc.setQueryData(meKey, null),
  });
}

export function useCourses() {
  return useQuery({ queryKey: ['courses'], queryFn: api.courses });
}
