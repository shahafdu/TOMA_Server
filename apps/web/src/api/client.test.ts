import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './client.js';

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('parses JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ id: '1', fullName: 'Alice', email: null, role: 'hr' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    const session = await api.me();
    expect(session.role).toBe('hr');
  });

  it('throws ApiError with status/title on problem+json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ title: 'Not authenticated', status: 401 }), {
            status: 401,
            headers: { 'Content-Type': 'application/problem+json' },
          }),
      ),
    );
    await expect(api.me()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Not authenticated',
    });
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
  });
});
