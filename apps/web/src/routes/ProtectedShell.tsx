import { Navigate, Outlet } from 'react-router-dom';
import { useMe } from '../api/queries.js';
import { AppShell } from '../components/AppShell.js';
import { Loading } from '../components/common.js';

/**
 * Cosmetic auth gate around the app shell (plan §2.4 — the server is authoritative).
 * Unauthenticated users are redirected to the login page.
 */
export function ProtectedShell() {
  const me = useMe();
  if (me.isLoading) return <Loading />;
  if (!me.data) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
