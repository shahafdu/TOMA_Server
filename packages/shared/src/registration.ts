import { z } from 'zod';
import { CourseId, CourseSeriesId, EmployeeId, RegistrationId, Year } from './ids.js';
import { IsoDateTime } from './common.js';
import { EmployeeSummary } from './employee.js';
import { RegistrationSource, RegistrationStatus } from './enums.js';

/** Registration — an employee's enrollment in one course run (legacy `coursetouser`, enriched). */
export const Registration = z.object({
  id: RegistrationId,
  courseId: CourseId,
  employeeId: EmployeeId,
  status: RegistrationStatus,
  source: RegistrationSource,
  requestedBy: EmployeeId.nullable(),
  approvedBy: EmployeeId.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Registration = z.infer<typeof Registration>;

/**
 * A prior participation in the same series, surfaced when registering an employee so managers
 * can see (and knowingly repeat) a past enrollment (plan §2.8 item 2 / requirement #4).
 */
export const PriorParticipation = z.object({
  courseId: CourseId,
  seriesId: CourseSeriesId,
  year: Year,
  title: z.string(),
  status: RegistrationStatus,
  attended: z.boolean(),
});
export type PriorParticipation = z.infer<typeof PriorParticipation>;

export const CreateRegistrationInput = z.object({
  employeeId: EmployeeId,
  source: RegistrationSource,
});
export type CreateRegistrationInput = z.infer<typeof CreateRegistrationInput>;

/** Seat accounting for a course (requirement #8). `null` seat fields mean unlimited (online). */
export const CourseAvailability = z.object({
  courseId: CourseId,
  capacity: z.number().int().nullable(),
  registered: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  waitlisted: z.number().int().nonnegative().default(0),
  seatsLeft: z.number().int().nullable(),
  unlimited: z.boolean(),
  perManagerLimit: z.number().int().nullable(),
  /** The signed-in user's own registration status on this course (calendar hover, requirement #5). */
  myStatus: RegistrationStatus.nullable().default(null),
  /** Registration lock deadline from the course's quarterly cycle, if any (requirement #3). */
  registrationClosesAt: IsoDateTime.nullable().default(null),
  /** True once registration is locked — only HR can change registrations (requirement #4). */
  locked: z.boolean().default(false),
});
export type CourseAvailability = z.infer<typeof CourseAvailability>;

/** One candidate in the registration roster: an employee plus their eligibility for the course. */
export const RosterEntry = z.object({
  employee: EmployeeSummary,
  status: RegistrationStatus.nullable(),
  eligible: z.boolean(),
  /** Why the employee cannot be registered (constraint/seat), or null when eligible. */
  reason: z.string().nullable(),
});
export type RosterEntry = z.infer<typeof RosterEntry>;

/**
 * The registration roster for a course, scoped to the caller's team (manager) or the whole
 * org (HR). Drives the click-to-register panel (requirement #7) and enforces the seat/eligibility
 * rules (requirements #8/#9) before any write.
 */
export const CourseRoster = z.object({
  availability: CourseAvailability,
  /** Active seats the caller (a manager) has already filled for this course. */
  managerSeatsUsed: z.number().int().nonnegative(),
  /** Remaining seats the caller may fill given the per-manager cap (`null` = no cap). */
  managerSeatsLeft: z.number().int().nullable(),
  entries: z.array(RosterEntry),
});
export type CourseRoster = z.infer<typeof CourseRoster>;

/** Response to a registration create/precheck: the new/proposed row plus visibility context. */
export const RegistrationResult = z.object({
  registration: Registration.nullable(),
  priorParticipations: z.array(PriorParticipation),
  /** Same-day session conflicts against the employee's other registrations (hour-granular). */
  conflicts: z.array(
    z.object({
      courseId: CourseId,
      title: z.string(),
      startsAt: IsoDateTime,
      endsAt: IsoDateTime,
    }),
  ),
});
export type RegistrationResult = z.infer<typeof RegistrationResult>;
