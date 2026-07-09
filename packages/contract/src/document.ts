import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  Attendance,
  AttendanceGrid,
  AttendanceJustification,
  AttendanceReport,
  BudgetReport,
  ComplianceReport,
  Course,
  CourseAvailability,
  CourseBid,
  CourseRoster,
  CourseSeries,
  CourseSession,
  CreateCourseInput,
  CreateCycleInput,
  CreateRegistrationInput,
  CycleBoard,
  EducationHours,
  Employee,
  EmployeeId,
  EmployeeSummary,
  MarkAttendanceInput,
  MyTraining,
  NotificationMessage,
  NotificationRule,
  OpenBiddingInput,
  OpenRegistrationInput,
  PriorParticipation,
  Registration,
  RegistrationResult,
  ReviewJustificationInput,
  Role,
  SetAttendanceInput,
  SetBidInput,
  SubmitJustificationInput,
  TrainingCycle,
  UpdateCourseInput,
  UpsertNotificationRuleInput,
} from '@toma/shared';

extendZodWithOpenApi(z);

/**
 * The TOMA API v1 contract, generated from the @toma/shared zod schemas so the client and
 * server share one definition (plan §2.10, task T0.6). This is a representative core of the
 * §2.2 surface — remaining endpoints are added the same way. Run `npm run contract:gen` to
 * emit `openapi.json`; `npm run contract:check` fails CI if the committed file is stale.
 */
const registry = new OpenAPIRegistry();

// ---- Reusable component schemas -------------------------------------------------------------

const ProblemDetails = registry.register(
  'ProblemDetails',
  z.object({
    type: z.string().default('about:blank'),
    title: z.string(),
    status: z.number().int(),
    detail: z.string().optional(),
    instance: z.string().optional(),
  }),
);

const AuthMe = registry.register(
  'AuthMe',
  z.object({
    id: EmployeeId,
    fullName: z.string(),
    email: z.string().email().nullable(),
    role: Role,
    /** Whether the user manages anyone — drives the "My team" dashboard tab. */
    hasTeam: z.boolean(),
  }),
);

registry.register('Employee', Employee);
registry.register('EmployeeSummary', EmployeeSummary);
registry.register('CourseSeries', CourseSeries);
registry.register('Course', Course);
registry.register('CourseSession', CourseSession);
registry.register('Registration', Registration);
registry.register('PriorParticipation', PriorParticipation);
registry.register('RegistrationResult', RegistrationResult);
registry.register('Attendance', Attendance);
registry.register('EducationHours', EducationHours);
registry.register('NotificationRule', NotificationRule);
registry.register('MyTraining', MyTraining);
registry.register('ComplianceReport', ComplianceReport);
registry.register('BudgetReport', BudgetReport);
registry.register('AttendanceReport', AttendanceReport);
registry.register('CourseAvailability', CourseAvailability);
registry.register('CourseRoster', CourseRoster);
registry.register('TrainingCycle', TrainingCycle);
registry.register('CycleBoard', CycleBoard);
registry.register('CourseBid', CourseBid);
registry.register('NotificationMessage', NotificationMessage);
registry.register('AttendanceGrid', AttendanceGrid);
registry.register('AttendanceJustification', AttendanceJustification);

function page<T extends z.ZodTypeAny>(name: string, item: T) {
  return registry.register(
    name,
    z.object({
      items: z.array(item),
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
    }),
  );
}

const EmployeePage = page('EmployeePage', EmployeeSummary);
const CoursePage = page('CoursePage', Course);

const pageQuery = {
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
};

const json = <T extends z.ZodTypeAny>(schema: T) => ({
  'application/json': { schema },
});

const problem = (description: string) => ({
  description,
  content: json(ProblemDetails),
});

// ---- Auth ------------------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/auth/me',
  tags: ['auth'],
  summary: 'Current authenticated user and resolved role',
  responses: {
    200: { description: 'The current session identity', content: json(AuthMe) },
    401: problem('Not authenticated'),
  },
});

// ---- Employees -------------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/employees',
  tags: ['employees'],
  summary: 'List employees (server-side paginated & filtered)',
  request: {
    query: z.object({
      query: z.string().optional(),
      managerId: z.string().optional(),
      department: z.string().optional(),
      ...pageQuery,
    }),
  },
  responses: {
    200: { description: 'A page of employees', content: json(EmployeePage) },
    403: problem('Not permitted for this role'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/employees/{id}',
  tags: ['employees'],
  summary: 'Employee profile (fields masked per role)',
  request: { params: z.object({ id: EmployeeId }) },
  responses: {
    200: { description: 'The employee', content: json(Employee) },
    404: problem('No such employee'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/employees/{id}/history',
  tags: ['employees'],
  summary: 'Full multi-year training history grouped by series (requirement #4)',
  request: { params: z.object({ id: EmployeeId }) },
  responses: {
    200: {
      description: 'Prior participations across all years',
      content: json(z.array(PriorParticipation)),
    },
    404: problem('No such employee'),
  },
});

// ---- Courses & series ------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/courses',
  tags: ['courses'],
  summary: 'List course runs',
  request: {
    query: z.object({
      year: z.coerce.number().int().optional(),
      status: z.string().optional(),
      type: z.string().optional(),
      seriesId: z.coerce.number().int().optional(),
      q: z.string().optional(),
      ...pageQuery,
    }),
  },
  responses: {
    200: { description: 'A page of courses', content: json(CoursePage) },
  },
});

registry.registerPath({
  method: 'post',
  path: '/courses',
  tags: ['courses'],
  summary: 'Create a course (HR); a manager create is forced to status=requested',
  request: { body: { content: json(CreateCourseInput) } },
  responses: {
    201: { description: 'Created', content: json(Course) },
    403: problem('Not permitted for this role'),
    422: problem('Validation failed'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/courses/{id}',
  tags: ['courses'],
  summary: 'Course detail',
  request: { params: z.object({ id: z.coerce.number().int() }) },
  responses: {
    200: { description: 'The course', content: json(Course) },
    404: problem('No such course'),
  },
});

registry.registerPath({
  method: 'patch',
  path: '/courses/{id}',
  tags: ['courses'],
  summary: 'Update a course',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: { content: json(UpdateCourseInput) },
  },
  responses: {
    200: { description: 'Updated', content: json(Course) },
    404: problem('No such course'),
    422: problem('Validation failed'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/courses/{id}/sessions',
  tags: ['courses'],
  summary: 'Sessions of a course',
  request: { params: z.object({ id: z.coerce.number().int() }) },
  responses: {
    200: { description: 'Sessions', content: json(z.array(CourseSession)) },
  },
});

// ---- Registrations ---------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/courses/{id}/roster',
  tags: ['registrations'],
  summary:
    "Registration roster for the caller's scope: seat availability + eligibility per person (req. #7/#8/#9)",
  request: { params: z.object({ id: z.coerce.number().int() }) },
  responses: {
    200: { description: 'Roster with availability & eligibility', content: json(CourseRoster) },
    403: problem('Not permitted for this role'),
    404: problem('No such course'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/courses/{id}/availability',
  tags: ['registrations'],
  summary: 'Seat accounting for a course (total & remaining seats; null = unlimited)',
  request: { params: z.object({ id: z.coerce.number().int() }) },
  responses: {
    200: { description: 'Seat availability', content: json(CourseAvailability) },
    404: problem('No such course'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/courses/{id}/registrations',
  tags: ['registrations'],
  summary: 'Register an employee; response surfaces prior participations & conflicts (req. #4)',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: { content: json(CreateRegistrationInput) },
  },
  responses: {
    201: {
      description: 'Registered (or waitlisted / pending approval)',
      content: json(RegistrationResult),
    },
    403: problem('Not permitted for this role'),
    409: problem('Course full and waitlist disabled'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/courses/{id}/registrations/precheck',
  tags: ['registrations'],
  summary: 'Bulk duplicate/conflict precheck before committing registrations',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    query: z.object({ employeeIds: z.string().describe('comma-separated employee ids') }),
  },
  responses: {
    200: {
      description: 'Per-employee prior participations & conflicts',
      content: json(z.array(RegistrationResult)),
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/courses/{id}/registrations/{employeeId}',
  tags: ['registrations'],
  summary: "Approve / decline / cancel a person's registration on a course (requirement #7)",
  request: {
    params: z.object({ id: z.coerce.number().int(), employeeId: EmployeeId }),
    body: { content: json(z.object({ action: z.enum(['approve', 'decline', 'cancel']) })) },
  },
  responses: {
    200: {
      description: 'The new registration status',
      content: json(z.object({ status: z.string() })),
    },
    404: problem('No such registration'),
  },
});

// ---- Attendance ------------------------------------------------------------------------------

registry.registerPath({
  method: 'put',
  path: '/sessions/{sessionId}/attendance/{employeeId}',
  tags: ['attendance'],
  summary: 'Mark or unmark attendance for an employee at a session',
  request: {
    params: z.object({ sessionId: z.coerce.number().int(), employeeId: EmployeeId }),
    body: { content: json(SetAttendanceInput) },
  },
  responses: {
    200: { description: 'Attendance state', content: json(Attendance) },
    404: problem('No such session or employee'),
  },
});

// ---- Notification rules ----------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/notification-rules',
  tags: ['notifications'],
  summary: 'List HR-configured notification rules',
  responses: {
    200: { description: 'Rules', content: json(z.array(NotificationRule)) },
    403: problem('HR only'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/notification-rules',
  tags: ['notifications'],
  summary: 'Create a notification rule (HR)',
  request: { body: { content: json(UpsertNotificationRuleInput) } },
  responses: {
    201: { description: 'Created', content: json(NotificationRule) },
    403: problem('HR only'),
    422: problem('Validation failed'),
  },
});

// ---- Reports ---------------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/reports/hours',
  tags: ['reports'],
  summary: 'Education-hours rollup (server-computed)',
  request: {
    query: z.object({
      year: z.coerce.number().int(),
      managerId: z.string().optional(),
    }),
  },
  responses: {
    200: { description: 'Per-employee hours for the year', content: json(z.array(EducationHours)) },
  },
});

registry.registerPath({
  method: 'get',
  path: '/reports/compliance',
  tags: ['reports'],
  summary:
    'Mandatory-training compliance. scope=team (full org subtree) or organization (HR/admin)',
  request: {
    query: z.object({
      scope: z.enum(['team', 'organization']).optional(),
      year: z.coerce.number().int().optional(),
    }),
  },
  responses: {
    200: { description: 'Compliance report', content: json(ComplianceReport) },
    403: problem('Not permitted for this role'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/reports/budget',
  tags: ['reports'],
  summary: 'Yearly training budget vs committed spend (HR/admin only)',
  request: { query: z.object({ year: z.coerce.number().int().optional() }) },
  responses: {
    200: { description: 'Budget report', content: json(BudgetReport) },
    403: problem('Not permitted for this role'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/reports/attendance',
  tags: ['reports'],
  summary:
    'Attendance rollup — did registered people attend? scope=team (org subtree) or organization (HR)',
  request: {
    query: z.object({
      scope: z.enum(['team', 'organization']).optional(),
      year: z.coerce.number().int().optional(),
    }),
  },
  responses: {
    200: { description: 'Attendance report', content: json(AttendanceReport) },
    403: problem('Not permitted for this role'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/me/training',
  tags: ['reports'],
  summary: "The signed-in user's personal training summary (hours + required courses)",
  request: { query: z.object({ year: z.coerce.number().int().optional() }) },
  responses: {
    200: { description: 'Personal training summary', content: json(MyTraining) },
    401: problem('Not authenticated'),
  },
});

// ---- Quarterly bidding / registration lifecycle ---------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/cycles/board',
  tags: ['cycles'],
  summary: "A cycle's bidding/registration board, scoped to the caller (manager bids / HR review)",
  request: { query: z.object({ cycleId: z.coerce.number().int().optional() }) },
  responses: {
    200: { description: 'The cycle board', content: json(CycleBoard) },
    403: problem('Not permitted for this role'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/cycles',
  tags: ['cycles'],
  summary: 'Create a quarterly training cycle (HR)',
  request: { body: { content: json(CreateCycleInput) } },
  responses: {
    201: { description: 'Created cycle', content: json(TrainingCycle) },
    403: problem('Not permitted for this role'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/cycles/{id}/open-bidding',
  tags: ['cycles'],
  summary: 'HR opens bidding on candidate courses with a deadline; managers are mailed (req. #1)',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: { content: json(OpenBiddingInput) },
  },
  responses: { 200: { description: 'Updated cycle', content: json(TrainingCycle) } },
});

registry.registerPath({
  method: 'post',
  path: '/cycles/{id}/open-registration',
  tags: ['cycles'],
  summary: 'HR opens registration for chosen courses with a lock deadline; managers mailed (#2)',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: { content: json(OpenRegistrationInput) },
  },
  responses: { 200: { description: 'Updated cycle', content: json(TrainingCycle) } },
});

registry.registerPath({
  method: 'post',
  path: '/cycles/{id}/lock',
  tags: ['cycles'],
  summary: 'Lock registration for a cycle — only HR can change registrations afterwards (#4)',
  request: { params: z.object({ id: z.coerce.number().int() }) },
  responses: { 200: { description: 'Locked cycle', content: json(TrainingCycle) } },
});

registry.registerPath({
  method: 'post',
  path: '/courses/{id}/bid',
  tags: ['cycles'],
  summary: "Set a manager's bid (seats wanted) on a candidate course (requirement #1)",
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: { content: json(SetBidInput) },
  },
  responses: { 204: { description: 'Bid saved' }, 403: problem('Bidding closed / not permitted') },
});

registry.registerPath({
  method: 'get',
  path: '/courses/{id}/bids',
  tags: ['cycles'],
  summary: 'All managers’ bids on a candidate course (HR review, requirement #2)',
  request: { params: z.object({ id: z.coerce.number().int() }) },
  responses: { 200: { description: 'Bids', content: json(z.array(CourseBid)) } },
});

registry.registerPath({
  method: 'post',
  path: '/courses/{id}/decision',
  tags: ['cycles'],
  summary: 'HR confirms or cancels a course by participant numbers; participants mailed (#6/#7/#8)',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: { content: json(z.object({ decision: z.enum(['confirm', 'cancel']) })) },
  },
  responses: { 200: { description: 'New lifecycle state', content: json(z.object({ state: z.string() })) } },
});

// ---- Notification outbox ---------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/notifications',
  tags: ['notifications'],
  summary: 'The signed-in user’s notification inbox (outbox stand-in for Exchange mail)',
  responses: {
    200: { description: 'Messages', content: json(z.array(NotificationMessage)) },
  },
});

registry.registerPath({
  method: 'post',
  path: '/notifications/dispatch',
  tags: ['notifications'],
  summary: 'Dispatch due notifications (simulates the scheduled Exchange send) — HR/admin/dev',
  responses: {
    200: { description: 'Count dispatched', content: json(z.object({ dispatched: z.number().int() })) },
    403: problem('Not permitted for this role'),
  },
});

// ---- Per-day attendance & justifications (requirement #9) ------------------------------------

registry.registerPath({
  method: 'get',
  path: '/courses/{id}/attendance-grid',
  tags: ['attendance'],
  summary: 'The per-day attendance grid HR fills in at the end of each course day (requirement #9)',
  request: { params: z.object({ id: z.coerce.number().int() }) },
  responses: { 200: { description: 'Attendance grid', content: json(AttendanceGrid) } },
});

registry.registerPath({
  method: 'put',
  path: '/courses/{id}/attendance',
  tags: ['attendance'],
  summary: 'HR marks one person present/absent for one day; an absence opens a justification (#9)',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: { content: json(MarkAttendanceInput) },
  },
  responses: { 204: { description: 'Recorded' }, 403: problem('Not permitted for this role') },
});

registry.registerPath({
  method: 'get',
  path: '/justifications',
  tags: ['attendance'],
  summary: 'No-show justifications visible to the caller (HR: all; manager: team; employee: own)',
  responses: {
    200: { description: 'Justifications', content: json(z.array(AttendanceJustification)) },
  },
});

registry.registerPath({
  method: 'post',
  path: '/justifications/{id}/submit',
  tags: ['attendance'],
  summary: 'Submit a reason for a no-show (employee or their manager)',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: { content: json(SubmitJustificationInput) },
  },
  responses: { 200: { description: 'Updated justification', content: json(AttendanceJustification) } },
});

registry.registerPath({
  method: 'post',
  path: '/justifications/{id}/review',
  tags: ['attendance'],
  summary: 'HR accepts or rejects a submitted justification',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: { content: json(ReviewJustificationInput) },
  },
  responses: { 200: { description: 'Reviewed justification', content: json(AttendanceJustification) } },
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'TOMA API',
      version: '1.0.0',
      description:
        'Training management system API. Contract generated from @toma/shared zod schemas.',
    },
    servers: [{ url: '/api/v1' }],
    tags: [
      { name: 'auth' },
      { name: 'employees' },
      { name: 'courses' },
      { name: 'registrations' },
      { name: 'attendance' },
      { name: 'notifications' },
      { name: 'reports' },
      { name: 'cycles' },
    ],
  });
}
