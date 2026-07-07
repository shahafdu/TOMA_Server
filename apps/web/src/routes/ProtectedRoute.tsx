import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMe } from '../api/queries.js';

/**
 * Cosmetic auth gate (plan §2.4 — the server is authoritative). Redirects unauthenticated
 * users to the login page.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const me = useMe();
  if (me.isLoading) return null;
  if (!me.data) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
