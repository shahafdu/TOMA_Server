import { z } from 'zod';
import { CourseId, CourseSeriesId, EmployeeId, RegistrationId, Year } from './ids.js';
import { IsoDateTime } from './common.js';
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
