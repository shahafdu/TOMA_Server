import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.factory.js';

describe('TOMA API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const login = async (username: string) => {
    const agent = request.agent(http);
    const res = await agent.post('/api/v1/auth/login').send({ username });
    return { agent, res };
  };

  it('health is public', async () => {
    const res = await request(http).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('serves its own OpenAPI contract', async () => {
    const res = await request(http).get('/api/v1/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
  });

  it('rejects /auth/me without a session (problem+json)', async () => {
    const res = await request(http).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.status).toBe(401);
  });

  it('logs in via DevAuth and returns the resolved role', async () => {
    const { res } = await login('alice');
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('hr');
  });

  it('rejects an unknown user', async () => {
    const { res } = await login('nobody');
    expect(res.status).toBe(401);
  });

  it('persists the session for /auth/me', async () => {
    const { agent } = await login('bob');
    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('manager');
    expect(me.body.fullName).toBe('Bob Levi');
  });

  it('allows the developer role outside production', async () => {
    const { res } = await login('devuser');
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('developer');
  });

  describe('RBAC', () => {
    it('forbids an employee from listing employees (403)', async () => {
      const { agent } = await login('carol');
      const res = await agent.get('/api/v1/employees');
      expect(res.status).toBe(403);
    });

    it('allows HR to list employees', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/employees');
      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe('budget field masking', () => {
    it('returns price to HR', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/courses');
      expect(res.status).toBe(200);
      expect(res.body[0].price).toBe(4500);
    });

    it('strips price for a non-budget role (employee)', async () => {
      const { agent } = await login('carol');
      const res = await agent.get('/api/v1/courses');
      expect(res.status).toBe(200);
      expect(res.body[0]).not.toHaveProperty('price');
      // non-budget fields remain
      expect(res.body[0].title).toBe('Intro to TypeScript');
    });
  });
});
