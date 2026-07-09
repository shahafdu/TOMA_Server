import { z } from 'zod';
import { CourseSessionId, EmployeeId } from './ids.js';
import { IsoDateTime } from './common.js';

/**
 * Attendance — one employee's presence at one session (legacy `coursedatetimetouser`).
 * In the new model this is the source of truth for education hours; totals are derived from
 * it rather than incrementally accumulated (fixes the drift described in plan §3.3 BB-5).
 */
export const Attendance = z.object({
  sessionId: CourseSessionId,
  employeeId: EmployeeId,
  present: z.boolean(),
  markedById: EmployeeId.nullable(),
  markedAt: IsoDateTime.nullable(),
});
export type Attendance = z.infer<typeof Attendance>;

export const SetAttendanceInput = z.object({
  present: z.boolean(),
});
export type SetAttendanceInput = z.infer<typeof SetAttendanceInput>;

/** HR marks one registered person present/absent for one day of a course (requirement #9). */
export const MarkAttendanceInput = z.object({
  employeeId: EmployeeId,
  sessionStart: IsoDateTime,
  present: z.boolean(),
});
export type MarkAttendanceInput = z.infer<typeof MarkAttendanceInput>;

/** The per-day attendance grid HR fills in at the end of each course day (requirement #9). */
export const AttendanceGrid = z.object({
  courseId: z.number().int(),
  courseTitle: z.string(),
  sessions: z.array(z.object({ startsAt: IsoDateTime, endsAt: IsoDateTime })),
  rows: z.array(
    z.object({
      employeeId: EmployeeId,
      employeeName: z.string(),
      /** Presence per session, aligned to `sessions` by index. */
      present: z.array(z.boolean()),
    }),
  ),
});
export type AttendanceGrid = z.infer<typeof AttendanceGrid>;

/** Per-employee education-hours rollup for a year (normalized `education_hours`, plan §4.9). */
export const EducationHours = z.object({
  employeeId: EmployeeId,
  year: z.number().int(),
  /** Derived from attendance. */
  hours: z.number().nonnegative(),
});
export type EducationHours = z.infer<typeof EducationHours>;
