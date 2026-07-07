import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  Attendance,
  Course,
  CourseSeries,
  CourseSession,
  CreateCourseInput,
  CreateRegistrationInput,
  EducationHours,
  Employee,
  EmployeeId,
  EmployeeSummary,
  NotificationRule,
  PriorParticipation,
  Registration,
  RegistrationResult,
  Role,
  SetAttendanceInput,
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
  path: '/registrations/{id}',
  tags: ['registrations'],
  summary: 'Approve / decline / cancel / waitlist a registration',
  request: {
    params: z.object({ id: z.coerce.number().int() }),
    body: {
      content: json(
        z.object({ action: z.enum(['approve', 'decline', 'cancel', 'waitlist', 'promote']) }),
      ),
    },
  },
  responses: {
    200: { description: 'Updated registration', content: json(Registration) },
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
    ],
  });
}
