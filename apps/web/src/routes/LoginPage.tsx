import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { useLogin, useMe } from '../api/queries.js';

/**
 * DevAuth login: username only (no password) against the dev provider. Replaced by the SSO
 * redirect / AD credential form when the real auth provider lands (plan T0.2).
 */
export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  if (me.data) return <Navigate to="/" replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(username, { onSuccess: () => navigate('/', { replace: true }) });
  };

  const error =
    login.error instanceof ApiError ? login.error.message : login.error ? 'Login failed' : null;

  return (
    <main style={{ maxWidth: 320, margin: '10vh auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>TOMA</h1>
      <p>Sign in to the training management system.</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          style={{ display: 'block', width: '100%', margin: '8px 0 16px', padding: 8 }}
        />
        <button
          type="submit"
          disabled={!username || login.isPending}
          style={{ padding: '8px 16px' }}
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error && (
        <p role="alert" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}
    </main>
  );
}
