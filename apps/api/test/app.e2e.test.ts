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

  describe('course disciplines', () => {
    it('exposes the discipline on courses', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/courses?year=2026');
      const security = res.body.find((c: { title: string }) => c.title === 'Security Awareness');
      expect(security.discipline).toBe('Security & Compliance');
      const disciplines = new Set(res.body.map((c: { discipline: string }) => c.discipline));
      expect(disciplines).toContain('Engineering');
      expect(disciplines).toContain('Cloud & Infra');
    });
  });

  describe('compliance report (big picture)', () => {
    it('gives HR org-wide mandatory compliance with per-course rates', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/reports/compliance?year=2026');
      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('organization');
      expect(res.body.totalPeople).toBe(6);
      const titles = res.body.courses.map((c: { title: string }) => c.title);
      expect(titles).toEqual(expect.arrayContaining(['Security Awareness', 'Code of Conduct']));
      const coc = res.body.courses.find((c: { title: string }) => c.title === 'Code of Conduct');
      expect(coc.total).toBe(6);
      expect(coc.completed).toBe(5); // seeded 5 of 6 attended
      expect(res.body.overallRate).toBeGreaterThan(0);
      expect(res.body.overallRate).toBeLessThanOrEqual(1);
    });

    it('scopes to the full subtree for a manager (everyone below, not just direct reports)', async () => {
      const { agent } = await login('bob');
      const res = await agent.get('/api/v1/reports/compliance?scope=team&year=2026');
      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('team');
      expect(res.body.totalPeople).toBe(2); // Carol + Dave (Erin left)
    });

    it('forbids an employee from the organization scope', async () => {
      const { agent } = await login('carol');
      expect((await agent.get('/api/v1/reports/compliance?scope=organization')).status).toBe(403);
    });

    it('reports hasTeam on login and /auth/me (bob manages, carol does not)', async () => {
      const bob = await login('bob');
      expect(bob.res.body.hasTeam).toBe(true); // login response carries it too
      expect((await bob.agent.get('/api/v1/auth/me')).body.hasTeam).toBe(true);
      const carol = await login('carol');
      expect(carol.res.body.hasTeam).toBe(false);
      // Alice is HR and also manages Bob's org → she has a team
      const alice = await login('alice');
      expect(alice.res.body.hasTeam).toBe(true);
    });
  });

  describe('personal training summary (my view)', () => {
    it('returns hours, target and the required-course checklist', async () => {
      const { agent } = await login('carol');
      const res = await agent.get('/api/v1/me/training?year=2026');
      expect(res.status).toBe(200);
      expect(res.body.employeeId).toBe('3');
      expect(res.body.hours).toBe(8);
      expect(res.body.targetHours).toBe(40);
      const coc = res.body.required.find((r: { title: string }) => r.title === 'Code of Conduct');
      expect(coc.completed).toBe(true); // Carol attended
      const privacy = res.body.required.find(
        (r: { title: string }) => r.title === 'Data Privacy & Policy Compliance',
      );
      expect(privacy.completed).toBe(false); // Carol did not
    });
  });
});
