import { z } from 'zod';
import { CourseId, CourseSeriesId, CourseSessionId, EmployeeId, Year } from './ids.js';
import { IsoDateTime } from './common.js';
import {
  CourseStatus,
  CourseType,
  DeliveryType,
  Platform,
  SelfRegistrationPolicy,
} from './enums.js';

/**
 * CourseSeries — the recurring-course identity that the legacy `"Name #N YYYY"` naming
 * convention only approximated (plan §2.3 / §4.2 / requirement #3). Each yearly run is a Course.
 */
export const CourseSeries = z.object({
  id: CourseSeriesId,
  canonicalName: z.string().min(1),
  type: CourseType,
  description: z.string().nullable(),
  tags: z.array(z.string()).default([]),
});
export type CourseSeries = z.infer<typeof CourseSeries>;

/** A single scheduled session (legacy `coursetodatetime`). */
export const CourseSession = z.object({
  id: CourseSessionId,
  courseId: CourseId,
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  venue: z.string().nullable(),
  /** Free-text lecturer label for display; structured lecturers live in CourseLecturer. */
  lecturer: z.string().nullable(),
});
export type CourseSession = z.infer<typeof CourseSession>;

/**
 * Course — one run of a series in a given year (legacy `coma.courses`).
 * `deliveryType` and lecturer sourcing are orthogonal (plan §2.3.1); `platform`/`platformUrl`
 * are only meaningful for online courses (enforced by the refinement below).
 */
export const Course = z
  .object({
    id: CourseId,
    seriesId: CourseSeriesId.nullable(),
    title: z.string().min(1),
    year: Year,
    descriptionHtml: z.string().nullable(),
    notes: z.string().nullable(),
    mailText: z.string().nullable(),
    type: CourseType,
    /** Subject domain/discipline (HR-defined), e.g. "Security & Compliance", "Cloud & Infra". */
    discipline: z.string().nullable(),
    status: CourseStatus,
    deliveryType: DeliveryType,
    platform: Platform.nullable(),
    platformUrl: z.string().url().nullable(),
    isMandatory: z.boolean(),
    isInternal: z.boolean(),
    /** Total training hours across all sessions. */
    totalHours: z.number().nonnegative(),
    /** Lightweight session date summary for cards/calendar (full sessions via the sessions endpoint). */
    sessions: z
      .array(z.object({ startsAt: IsoDateTime, endsAt: IsoDateTime }))
      .default([]),
    /** Budget-sensitive: masked for non-HR roles (plan §2.4). May be absent from the DTO. */
    price: z.number().nonnegative().nullable().optional(),
    capacity: z.number().int().positive().nullable(),
    selfRegistration: SelfRegistrationPolicy,
    ownerId: EmployeeId.nullable(),
  })
  .refine(
    (c) => c.deliveryType === 'online' || (c.platform === null && c.platformUrl === null),
    'platform/platformUrl are only valid for online courses',
  );
export type Course = z.infer<typeof Course>;

/** Input for creating a course. HR creates directly; a manager create is forced to `requested`. */
export const CreateCourseInput = z.object({
  seriesId: CourseSeriesId.nullable().optional(),
  title: z.string().min(1),
  year: Year,
  descriptionHtml: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  mailText: z.string().nullable().optional(),
  type: CourseType,
  discipline: z.string().nullable().optional(),
  totalHours: z.number().nonnegative().default(0),
  deliveryType: DeliveryType,
  platform: Platform.nullable().optional(),
  platformUrl: z.string().url().nullable().optional(),
  isMandatory: z.boolean().default(false),
  isInternal: z.boolean().default(true),
  price: z.number().nonnegative().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  selfRegistration: SelfRegistrationPolicy.default('none'),
});
export type CreateCourseInput = z.infer<typeof CreateCourseInput>;

export const UpdateCourseInput = CreateCourseInput.partial().extend({
  status: CourseStatus.optional(),
});
export type UpdateCourseInput = z.infer<typeof UpdateCourseInput>;
