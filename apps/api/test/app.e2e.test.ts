import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.factory.js';

/**
 * Integration tests against the seeded mockup DB (`db/`). They assume the DB is up and seeded
 * (`npm run db:setup`); CI does this via a MariaDB service before running the suite.
 */
describe('TOMA API (e2e, against mockup DB)', () => {
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

  it('rejects /auth/me without a session (problem+json)', async () => {
    const res = await request(http).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });

  describe('DevAuth + roles resolved from the DB', () => {
    it.each([
      ['alice', 'hr'],
      ['bob', 'manager'],
      ['carol', 'employee'],
      ['admin', 'admin'], // via coma.user_role override
      ['devuser', 'developer'], // via coma.user_role override
    ])('logs in %s as %s', async (username, role) => {
      const { res } = await login(username);
      expect(res.status).toBe(200);
      expect(res.body.role).toBe(role);
    });

    it('rejects an unknown user', async () => {
      const { res } = await login('nobody');
      expect(res.status).toBe(401);
    });

    it('returns the profile from emma.users at /auth/me', async () => {
      const { agent } = await login('bob');
      const me = await agent.get('/api/v1/auth/me');
      expect(me.body).toMatchObject({
        fullName: 'Bob Levi',
        role: 'manager',
        email: 'bob@example.com',
      });
    });
  });

  describe('RBAC', () => {
    it('forbids an employee from listing employees (403)', async () => {
      const { agent } = await login('carol');
      expect((await agent.get('/api/v1/employees')).status).toBe(403);
    });

    it('lists only working employees for HR (erin who left is excluded)', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/employees');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(6);
      const names = res.body.items.map((e: { fullName: string }) => e.fullName);
      expect(names).not.toContain('Erin Gross');
      // department normalized from the "(R&D)" legacy format
      const bob = res.body.items.find((e: { fullName: string }) => e.fullName === 'Bob Levi');
      expect(bob.department).toBe('R&D');
    });
  });

  describe('budget field masking', () => {
    it('returns price to HR', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/courses?year=2026');
      expect(res.status).toBe(200);
      const ts = res.body.find((c: { title: string }) => c.title === 'Intro to TypeScript');
      expect(ts.price).toBe(4500);
      // legacy substring collision is resolved: Java and JavaScript are distinct courses
      const titles = res.body.map((c: { title: string }) => c.title);
      expect(titles).toEqual(expect.arrayContaining(['Java', 'JavaScript']));
    });

    it('strips price for a non-budget role (employee)', async () => {
      const { agent } = await login('carol');
      const res = await agent.get('/api/v1/courses?year=2026');
      expect(res.status).toBe(200);
      expect(res.body[0]).not.toHaveProperty('price');
    });
  });

  describe('multi-year training history (requirement #4)', () => {
    it("shows Carol's prior participation in the TypeScript series across 2025 and 2026", async () => {
      const { agent } = await login('carol');
      const res = await agent.get('/api/v1/employees/3/history');
      expect(res.status).toBe(200);
      const ts = res.body.filter((p: { title: string }) => p.title === 'Intro to TypeScript');
      expect(ts.map((p: { year: number }) => p.year).sort()).toEqual([2025, 2026]);
      // same normalized title ⇒ same synthetic series id (groups the runs)
      expect(new Set(ts.map((p: { seriesId: number }) => p.seriesId)).size).toBe(1);
      // 2025 run was attended
      const run2025 = ts.find((p: { year: number }) => p.year === 2025);
      expect(run2025.attended).toBe(true);
    });
  });

  describe('registration writes (requirement #4 — prior-participation visibility)', () => {
    it('forbids an employee from registering others', async () => {
      const { agent } = await login('carol');
      const res = await agent
        .post('/api/v1/courses/202/registrations')
        .send({ employeeId: '4', source: 'manager' });
      expect(res.status).toBe(403);
    });

    it('registers an employee and surfaces prior participation in the same series', async () => {
      const { agent } = await login('alice');
      // Registering Carol (id 3) for the 2026 TypeScript run should reveal her 2025 run.
      const res = await agent
        .post('/api/v1/courses/201/registrations')
        .send({ employeeId: '3', source: 'hr' });
      expect(res.status).toBe(201);
      expect(res.body.registration).toMatchObject({
        courseId: 201,
        employeeId: '3',
        status: 'registered',
      });
      const priorYears = res.body.priorParticipations.map((p: { year: number }) => p.year);
      expect(priorYears).toContain(2025);
      expect(Array.isArray(res.body.conflicts)).toBe(true);
    });

    it('404s for an unknown course', async () => {
      const { agent } = await login('alice');
      const res = await agent
        .post('/api/v1/courses/999999/registrations')
        .send({ employeeId: '3', source: 'hr' });
      expect(res.status).toBe(404);
    });

    it('prechecks multiple employees at once', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/courses/201/registrations/precheck?employeeIds=3,4');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].registration).toBeNull();
      // Carol (first id) has the 2025 prior run; Dave (id 4) does not.
      expect(res.body[0].priorParticipations.some((p: { year: number }) => p.year === 2025)).toBe(
        true,
      );
    });
  });
});
