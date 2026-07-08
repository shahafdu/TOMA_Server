import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTheme } from '../theme.js';
import { LoginPage } from './LoginPage.js';

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={getTheme('light')}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      const method = init?.method ?? 'GET';
      if (href.endsWith('/auth/me')) {
        return new Response(JSON.stringify({ title: 'Not authenticated', status: 401 }), {
          status: 401,
        });
      }
      if (href.endsWith('/auth/login') && method === 'POST') {
        return new Response(
          JSON.stringify({ id: '1', fullName: 'Alice', email: null, role: 'hr' }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 200 });
    }),
  );
});

afterEach(() => vi.restoreAllMocks());

describe('LoginPage', () => {
  it('renders the sign-in form', async () => {
    renderLogin();
    expect(await screen.findByRole('heading', { name: 'TOMA' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('submits the username to the login endpoint', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(await screen.findByLabelText('Username'), 'alice');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      const loginCall = calls.find((c) => String(c[0]).endsWith('/auth/login'));
      expect(loginCall).toBeDefined();
      expect(String((loginCall?.[1] as RequestInit).body)).toContain('alice');
    });
  });
});
