import { z } from 'zod';
import {
  CourseId,
  CourseSessionId,
  EmployeeId,
  ExternalLecturerId,
  TrainingProviderId,
} from './ids.js';
import { Email } from './common.js';

/** A reusable external training vendor (plan §2.3.1). */
export const TrainingProvider = z.object({
  id: TrainingProviderId,
  name: z.string().min(1),
  contactName: z.string().nullable(),
  contactEmail: Email.nullable(),
  notes: z.string().nullable(),
});
export type TrainingProvider = z.infer<typeof TrainingProvider>;

/**
 * An external lecturer — either a vendor's staff (`providerId` set) or an individually
 * invited person (`providerId` null).
 */
export const ExternalLecturer = z.object({
  id: ExternalLecturerId,
  name: z.string().min(1),
  email: Email.nullable(),
  providerId: TrainingProviderId.nullable(),
});
export type ExternalLecturer = z.infer<typeof ExternalLecturer>;

/**
 * A lecturer assignment on a course, optionally scoped to a single session.
 * Exactly one of `employeeId` / `externalLecturerId` is set (internal vs. external);
 * a course may carry several assignments, mixing internal and external.
 */
export const CourseLecturer = z
  .object({
    courseId: CourseId,
    sessionId: CourseSessionId.nullable(),
    employeeId: EmployeeId.nullable(),
    externalLecturerId: ExternalLecturerId.nullable(),
  })
  .refine(
    (v) => (v.employeeId != null) !== (v.externalLecturerId != null),
    'exactly one of employeeId or externalLecturerId must be set',
  );
export type CourseLecturer = z.infer<typeof CourseLecturer>;
