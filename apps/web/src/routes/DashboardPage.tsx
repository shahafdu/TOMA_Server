import { useCourses, useLogout, useMe } from '../api/queries.js';

/** Placeholder role-aware home (plan §2.6). Real dashboards land in T4.12. */
export function DashboardPage() {
  const me = useMe();
  const logout = useLogout();
  const courses = useCourses();

  return (
    <main style={{ maxWidth: 720, margin: '5vh auto', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>TOMA</h1>
        <div>
          <span style={{ marginRight: 12 }}>
            {me.data?.fullName} · <strong>{me.data?.role}</strong>
          </span>
          <button onClick={() => logout.mutate()}>Sign out</button>
        </div>
      </header>

      <h2>Course catalog</h2>
      {courses.isLoading && <p>Loading…</p>}
      {courses.error && <p role="alert">Could not load courses.</p>}
      <ul>
        {courses.data?.map((c) => (
          <li key={c.id}>
            {c.title} <em>({c.year})</em>
            {/* price is present only for roles allowed to see budget data (server-masked) */}
            {typeof c.price === 'number' && <> — ₪{c.price.toLocaleString()}</>}
          </li>
        ))}
      </ul>
    </main>
  );
}
