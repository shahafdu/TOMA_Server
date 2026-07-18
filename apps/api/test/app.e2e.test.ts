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
      expect(res.body.total).toBe(8); // 6 permanent + Frank (subcontractor) + Gina (student)
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
    it('exposes the discipline and sub-discipline on courses', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/courses?year=2026');
      const security = res.body.find((c: { title: string }) => c.title === 'Security Awareness');
      expect(security.discipline).toBe('IT');
      expect(security.subDiscipline).toBe('Information Security');
      const disciplines = new Set(res.body.map((c: { discipline: string }) => c.discipline));
      expect(disciplines).toContain('SW');
      expect(disciplines).toContain('DevOps');
    });
  });

  describe('compliance report (big picture)', () => {
    it('gives HR org-wide mandatory compliance with per-course rates', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/reports/compliance?year=2026');
      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('organization');
      expect(res.body.totalPeople).toBe(8);
      const titles = res.body.courses.map((c: { title: string }) => c.title);
      expect(titles).toEqual(expect.arrayContaining(['Security Awareness', 'Code of Conduct']));
      const coc = res.body.courses.find((c: { title: string }) => c.title === 'Code of Conduct');
      expect(coc.total).toBe(8);
      expect(coc.completed).toBe(5); // seeded 5 attended
      expect(res.body.overallRate).toBeGreaterThan(0);
      expect(res.body.overallRate).toBeLessThanOrEqual(1);
    });

    it('scopes to the full subtree for a manager (everyone below, not just direct reports)', async () => {
      const { agent } = await login('bob');
      const res = await agent.get('/api/v1/reports/compliance?scope=team&year=2026');
      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('team');
      expect(res.body.totalPeople).toBe(4); // Carol + Dave + Frank + Gina (Erin left)
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

  describe('courses expose total hours and session dates (S1 #2/#3)', () => {
    it('returns totalHours and sorted session summaries on each course', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/courses?year=2026');
      expect(res.status).toBe(200);
      const k8s = res.body.find((c: { title: string }) => c.title === 'Kubernetes Fundamentals');
      expect(k8s.totalHours).toBe(12);
      expect(k8s.sessions).toHaveLength(2); // two seeded dates
      expect(k8s.sessions[0].startsAt <= k8s.sessions[1].startsAt).toBe(true);
      // Q4 course (Oct) — feeds the catalog quarter filter
      expect(new Date(k8s.sessions[0].startsAt).getMonth()).toBe(9);
    });

    it('attaches sessions on the single-course detail too', async () => {
      const { agent } = await login('carol');
      const res = await agent.get('/api/v1/courses/201');
      expect(res.status).toBe(200);
      expect(res.body.totalHours).toBe(8);
      expect(res.body.sessions).toHaveLength(2);
    });
  });

  describe('training budget report (S1 #1)', () => {
    it('gives HR the yearly budget, committed spend and per-discipline breakdown', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/reports/budget?year=2026');
      expect(res.status).toBe(200);
      expect(res.body.year).toBe(2026);
      expect(res.body.budget).toBe(120000);
      // committed = sum of non-tentative 2026 course prices (excludes tentative "Future AI")
      expect(res.body.committed).toBeGreaterThan(0);
      expect(Array.isArray(res.body.byDiscipline)).toBe(true);
      const sw = res.body.byDiscipline.find((d: { discipline: string }) => d.discipline === 'SW');
      expect(sw.amount).toBeGreaterThan(0);
    });

    it('forbids budget for a manager and an employee', async () => {
      const bob = await login('bob');
      expect((await bob.agent.get('/api/v1/reports/budget')).status).toBe(403);
      const carol = await login('carol');
      expect((await carol.agent.get('/api/v1/reports/budget')).status).toBe(403);
    });
  });

  describe('course delivery: in-person room vs online link (delivery requirement)', () => {
    it('online courses carry a connection link, no room, and unlimited seats', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/courses?year=2026');
      const security = res.body.find((c: { title: string }) => c.title === 'Security Awareness');
      expect(security.deliveryType).toBe('online');
      expect(security.platformUrl).toMatch(/^https:\/\//);
      expect(security.location).toBeNull();
      expect(security.capacity).toBeNull(); // unlimited
    });

    it('in-person courses carry a room and (optionally) a seat cap', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/courses?year=2026');
      const k8s = res.body.find((c: { title: string }) => c.title === 'Kubernetes Fundamentals');
      expect(k8s.deliveryType).toBe('in_person');
      expect(k8s.location).toBe('Room B');
      expect(k8s.platformUrl).toBeNull();
      expect(k8s.capacity).toBe(12);
      expect(k8s.restrictedTeams).toEqual(['R&D']);
    });
  });

  describe('seat availability (#8)', () => {
    it('reports remaining seats for a capped in-person course', async () => {
      const { agent } = await login('bob');
      const res = await agent.get('/api/v1/courses/207/availability');
      expect(res.status).toBe(200);
      expect(res.body.capacity).toBe(12);
      expect(res.body.registered).toBe(2); // Carol + Dave seeded
      expect(res.body.seatsLeft).toBe(10);
      expect(res.body.unlimited).toBe(false);
    });

    it('reports unlimited seats for an online course', async () => {
      const { agent } = await login('bob');
      const res = await agent.get('/api/v1/courses/208/availability');
      expect(res.body.unlimited).toBe(true);
      expect(res.body.seatsLeft).toBeNull();
    });
  });

  describe('registration roster (#7)', () => {
    it('gives a manager their team with per-person eligibility and seat accounting', async () => {
      const { agent } = await login('bob');
      const res = await agent.get('/api/v1/courses/207/roster');
      expect(res.status).toBe(200);
      const ids = res.body.entries.map((e: { employee: { id: string } }) => e.employee.id).sort();
      expect(ids).toEqual(['3', '4', '8', '9']); // Bob's subtree incl. contractor + student
      const carol = res.body.entries.find(
        (e: { employee: { id: string } }) => e.employee.id === '3',
      );
      expect(carol.status).toBe('registered');
      expect(carol.eligible).toBe(false); // already registered
      const frank = res.body.entries.find(
        (e: { employee: { id: string } }) => e.employee.id === '8',
      );
      expect(frank.eligible).toBe(true); // R&D, no exclusion on this course
      expect(res.body.availability.seatsLeft).toBe(10);
    });

    it('forbids the roster for a plain employee', async () => {
      const { agent } = await login('carol');
      expect((await agent.get('/api/v1/courses/207/roster')).status).toBe(403);
    });
  });

  describe('registration constraints (#8/#9)', () => {
    it('excludes students from a course that excludes students', async () => {
      const { agent } = await login('bob');
      const res = await agent
        .post('/api/v1/courses/201/registrations')
        .send({ employeeId: '9', source: 'manager' }); // Gina is a student; 201 excludes students
      expect(res.status).toBe(403);
      expect(res.body.detail ?? res.body.title).toMatch(/student/i);
    });

    it('excludes subcontractors from a course that excludes subcontractors', async () => {
      const { agent } = await login('bob');
      const res = await agent
        .post('/api/v1/courses/205/registrations')
        .send({ employeeId: '8', source: 'manager' }); // Frank is a subcontractor; 205 excludes them
      expect(res.status).toBe(403);
      expect(res.body.detail ?? res.body.title).toMatch(/subcontractor/i);
    });

    it('blocks registration from a team that is not allowed (team restriction)', async () => {
      const { agent } = await login('alice');
      const res = await agent
        .post('/api/v1/courses/207/registrations')
        .send({ employeeId: '5', source: 'hr' }); // Ada is in IT; 207 is R&D-only
      expect(res.status).toBe(403);
      expect(res.body.detail ?? res.body.title).toMatch(/team/i);
    });
  });

  describe('self-registration policy (#7)', () => {
    it('rejects self-registration when the course is not open for it', async () => {
      const { agent } = await login('devuser');
      const res = await agent
        .post('/api/v1/courses/202/registrations') // Java: selfRegistration none
        .send({ employeeId: '6', source: 'self' });
      expect(res.status).toBe(403);
    });

    it('registers directly on an open self-registration course', async () => {
      const { agent } = await login('devuser');
      const res = await agent
        .post('/api/v1/courses/210/registrations') // Design Systems: open
        .send({ employeeId: '6', source: 'self' });
      expect(res.status).toBe(201);
      expect(res.body.registration.status).toBe('registered');
    });

    it('creates a pending request on an approval-required course', async () => {
      const { agent } = await login('devuser');
      const res = await agent
        .post('/api/v1/courses/209/registrations') // Effective Communication: approval_required
        .send({ employeeId: '6', source: 'self' });
      expect(res.status).toBe(201);
      expect(res.body.registration.status).toBe('pending_approval');
    });

    it('forbids self-registering someone else', async () => {
      const { agent } = await login('carol');
      const res = await agent
        .post('/api/v1/courses/210/registrations')
        .send({ employeeId: '4', source: 'self' });
      expect(res.status).toBe(403);
    });
  });

  describe('approve / decline a pending registration (#7)', () => {
    it('lets a manager approve a pending self-request from their team', async () => {
      const { agent } = await login('bob');
      const res = await agent
        .patch('/api/v1/courses/209/registrations/4') // Dave's seeded pending request
        .send({ action: 'approve' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('registered');
    });

    it('404s when there is no such registration to manage', async () => {
      const { agent } = await login('bob');
      const res = await agent
        .patch('/api/v1/courses/207/registrations/999')
        .send({ action: 'cancel' });
      expect(res.status).toBe(404);
    });
  });

  describe('attendance report (#10)', () => {
    it('gives a manager their team attendance (only subtree people)', async () => {
      const { agent } = await login('bob');
      const res = await agent.get('/api/v1/reports/attendance?scope=team&year=2026');
      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('team');
      const ids = new Set(res.body.entries.map((e: { employeeId: string }) => e.employeeId));
      for (const id of ids) expect(['3', '4', '8', '9']).toContain(id);
      expect(res.body.attendedCount).toBeLessThanOrEqual(res.body.totalRegistrations);
    });

    it('gives HR the whole-org attendance list', async () => {
      const { agent } = await login('alice');
      const res = await agent.get('/api/v1/reports/attendance?scope=organization&year=2026');
      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('organization');
      const attended = res.body.entries.filter((e: { attended: boolean }) => e.attended);
      expect(attended.length).toBeGreaterThan(0); // seeded compliance attendance
    });

    it('forbids org-wide attendance for a plain employee', async () => {
      const { agent } = await login('carol');
      const res = await agent.get('/api/v1/reports/attendance?scope=organization');
      expect(res.status).toBe(403);
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

  describe('per-discipline training goals & development view', () => {
    it('exposes seeded 2026 discipline goals to any authenticated user', async () => {
      const { agent } = await login('carol');
      const res = await agent.get('/api/v1/goals?year=2026');
      expect(res.status).toBe(200);
      const sw = res.body.find((g: { discipline: string }) => g.discipline === 'SW');
      expect(sw.targetHours).toBe(40);
    });

    it("measures the employee's total hours against their own discipline's goal", async () => {
      const { agent } = await login('carol'); // Carol is SW (goal 40h)
      const res = await agent.get('/api/v1/me/training?year=2026');
      expect(res.status).toBe(200);
      expect(res.body.discipline).toBe('SW');
      expect(res.body.disciplineGoalHours).toBe(40);
      // byDiscipline is the informational "hours by subject" breakdown (no goal attached).
      expect(Array.isArray(res.body.byDiscipline)).toBe(true);
    });

    it('defaults an employee with no Emma discipline to General', async () => {
      const { agent } = await login('gina'); // seeded with NULL discipline
      const res = await agent.get('/api/v1/me/training?year=2026');
      expect(res.status).toBe(200);
      expect(res.body.discipline).toBe('General');
      expect(res.body.disciplineGoalHours).toBe(10);
    });

    it('team development lists people with their discipline, goal and elective counts', async () => {
      const { agent } = await login('bob');
      const res = await agent.get('/api/v1/reports/team-development?scope=team&year=2026');
      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('team');
      expect(res.body.members.length).toBe(res.body.totalPeople);
      expect(res.body.peopleWithElectives).toBeGreaterThan(0); // some attended non-mandatory courses
      const carol = res.body.members.find((m: { employeeName: string }) =>
        m.employeeName.startsWith('Carol'),
      );
      expect(carol.discipline).toBe('SW');
      expect(carol.disciplineGoalHours).toBe(40);
      expect(carol).toHaveProperty('metGoal');
      // the aggregate is grouped by the people's own discipline
      const sw = res.body.disciplines.find((d: { discipline: string }) => d.discipline === 'SW');
      expect(sw.totalPeople).toBeGreaterThan(0);
    });

    it('organization development is HR-only', async () => {
      const bob = await login('bob');
      expect(
        (await bob.agent.get('/api/v1/reports/team-development?scope=organization')).status,
      ).toBe(403);
      const alice = await login('alice');
      const res = await alice.agent.get(
        '/api/v1/reports/team-development?scope=organization&year=2026',
      );
      expect(res.status).toBe(200);
      expect(res.body.totalPeople).toBeGreaterThan(0);
    });

    it('only HR/admin may edit goals (isolated year)', async () => {
      const carol = await login('carol');
      expect(
        (
          await carol.agent
            .put('/api/v1/goals')
            .send({ year: 2099, goals: [{ discipline: 'SW', targetHours: 10 }] })
        ).status,
      ).toBe(403);

      const { agent } = await login('alice');
      const put = await agent.put('/api/v1/goals').send({
        year: 2099,
        goals: [
          { discipline: 'SW', targetHours: 10 },
          { discipline: 'Management', targetHours: 4 },
        ],
      });
      expect(put.status).toBe(200);
      expect(put.body).toHaveLength(2);
      const check = await agent.get('/api/v1/goals?year=2099');
      expect(check.body).toHaveLength(2);
    });
  });

  // The quarterly workflow mutates shared state, so it runs last and in sequence.
  describe('quarterly bidding → registration → lock → attendance lifecycle (S3)', () => {
    it('#1 shows the seeded Q4 bidding board with the manager’s own bids', async () => {
      const { agent } = await login('bob');
      const res = await agent.get('/api/v1/cycles/board');
      expect(res.status).toBe(200);
      expect(res.body.cycle.status).toBe('bidding');
      expect(res.body.cycle.quarter).toBe(4);
      const k8s = res.body.courses.find((c: { courseId: number }) => c.courseId === 207);
      expect(k8s.myBidSeats).toBe(2); // seeded bid
      expect(res.body.courses.length).toBe(4); // 205,206,207,210 candidates
    });

    it('#1 lets a manager change a bid while bidding is open', async () => {
      const { agent } = await login('bob');
      expect((await agent.post('/api/v1/courses/207/bid').send({ seats: 4 })).status).toBe(204);
      const board = await agent.get('/api/v1/cycles/board');
      const k8s = board.body.courses.find((c: { courseId: number }) => c.courseId === 207);
      expect(k8s.myBidSeats).toBe(4);
    });

    it('#1 forbids a plain employee from bidding', async () => {
      const { agent } = await login('carol');
      expect((await agent.post('/api/v1/courses/205/bid').send({ seats: 1 })).status).toBe(403);
    });

    it('#2 HR reviews bids and opens registration for the chosen courses', async () => {
      const { agent } = await login('alice');
      const bids = await agent.get('/api/v1/courses/207/bids');
      expect(bids.body.some((b: { managerId: string; seats: number }) => b.managerId === '2')).toBe(
        true,
      );
      const res = await agent.post('/api/v1/cycles/1/open-registration').send({
        registrationClosesAt: '2026-12-31T17:00:00.000Z',
        courseIds: [207, 210],
      });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('registration');

      const board = await agent.get('/api/v1/cycles/board');
      const state = (id: number) =>
        board.body.courses.find((c: { courseId: number }) => c.courseId === id).lifecycleState;
      expect(state(207)).toBe('open');
      expect(state(210)).toBe('open');
      expect(state(205)).toBe('rejected'); // not chosen
    });

    it('#2 mails managers that registration opened', async () => {
      const { agent } = await login('bob');
      const inbox = await agent.get('/api/v1/notifications');
      expect(inbox.body.some((m: { event: string }) => m.event === 'registration_opened')).toBe(
        true,
      );
    });

    it('#5 waitlists a registration when the course is full', async () => {
      const { agent } = await login('bob');
      // 210 has capacity 1, already filled by Carol → Dave is waitlisted.
      const res = await agent
        .post('/api/v1/courses/210/registrations')
        .send({ employeeId: '4', source: 'manager' });
      expect(res.status).toBe(201);
      expect(res.body.registration.status).toBe('waitlisted');
    });

    it('#5 promotes the waitlist when a seat frees up', async () => {
      const bob = await login('bob');
      // Cancel Carol's confirmed seat → Dave is promoted off the waitlist.
      const cancel = await bob.agent.patch('/api/v1/courses/210/registrations/3').send({
        action: 'cancel',
      });
      expect(cancel.status).toBe(200);
      const dave = await login('dave');
      const avail = await dave.agent.get('/api/v1/courses/210/availability');
      expect(avail.body.myStatus).toBe('registered');
    });

    it('#4 locks registration — managers blocked, HR can still change', async () => {
      const alice = await login('alice');
      const lock = await alice.agent.post('/api/v1/cycles/1/lock');
      expect(lock.status).toBe(201);
      expect(lock.body.status).toBe('locked');

      const bob = await login('bob');
      const blocked = await bob.agent
        .post('/api/v1/courses/207/registrations')
        .send({ employeeId: '9', source: 'manager' });
      expect(blocked.status).toBe(403); // locked for managers

      // HR override still works (add someone after lock, requirement #4).
      const hr = await alice.agent
        .post('/api/v1/courses/207/registrations')
        .send({ employeeId: '9', source: 'hr' });
      expect(hr.status).toBe(201);
      expect(hr.body.registration.status).toBe('registered');
    });

    it('#6/#7 HR confirms a course and participants are mailed with the dates', async () => {
      const alice = await login('alice');
      const res = await alice.agent
        .post('/api/v1/courses/207/decision')
        .send({ decision: 'confirm' });
      expect(res.status).toBe(201);
      expect(res.body.state).toBe('confirmed');

      const carol = await login('carol'); // Carol is registered on 207
      const inbox = await carol.agent.get('/api/v1/notifications');
      expect(
        inbox.body.some(
          (m: { event: string; courseId: number }) =>
            m.event === 'registration_confirmed' && m.courseId === 207,
        ),
      ).toBe(true);
    });

    it('dispatches due notifications (the Exchange send stand-in)', async () => {
      const { agent } = await login('alice');
      const res = await agent.post('/api/v1/notifications/dispatch');
      expect(res.status).toBe(201);
      expect(res.body.dispatched).toBeGreaterThan(0);
    });

    it('#9 HR fills per-day attendance; an absence opens a justification + mail', async () => {
      const alice = await login('alice');
      const grid = await alice.agent.get('/api/v1/courses/211/attendance-grid');
      expect(grid.status).toBe(200);
      expect(grid.body.sessions.length).toBe(1);
      const start = grid.body.sessions[0].startsAt;

      // Mark devuser (id 6, registered on 211, not seeded as attended) absent.
      const mark = await alice.agent
        .put('/api/v1/courses/211/attendance')
        .send({ employeeId: '6', sessionStart: start, present: false });
      expect(mark.status).toBe(204);

      const list = await alice.agent.get('/api/v1/justifications');
      const j = list.body.find(
        (x: { courseId: number; employeeId: string }) => x.courseId === 211 && x.employeeId === '6',
      );
      expect(j).toBeDefined();
      expect(j.status).toBe('requested');

      // The employee submits a reason; HR accepts it.
      const dev = await login('devuser');
      const submit = await dev.agent
        .post(`/api/v1/justifications/${j.id}/submit`)
        .send({ reason: 'Was on sick leave that day.' });
      expect(submit.status).toBe(201);
      expect(submit.body.status).toBe('submitted');

      const review = await alice.agent
        .post(`/api/v1/justifications/${j.id}/review`)
        .send({ decision: 'accept' });
      expect(review.status).toBe(201);
      expect(review.body.status).toBe('accepted');
    });

    it('#9 marking present records attendance in the grid', async () => {
      const alice = await login('alice');
      const grid = await alice.agent.get('/api/v1/courses/211/attendance-grid');
      const start = grid.body.sessions[0].startsAt;
      await alice.agent
        .put('/api/v1/courses/211/attendance')
        .send({ employeeId: '6', sessionStart: start, present: true });
      const after = await alice.agent.get('/api/v1/courses/211/attendance-grid');
      const row = after.body.rows.find((r: { employeeId: string }) => r.employeeId === '6');
      expect(row.present[0]).toBe(true);
    });
  });
});
