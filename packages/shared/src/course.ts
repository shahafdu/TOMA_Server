import { z } from 'zod';
import { CourseId, CourseSeriesId, CourseSessionId, CycleId, EmployeeId, Year } from './ids.js';
import { IsoDateTime } from './common.js';
import {
  CourseLifecycleState,
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
    /** High-level discipline (shared with employees), e.g. "SW", "DevOps", "Management". */
    discipline: z.string().nullable(),
    /** Finer topic within the discipline, e.g. "Web Development", "Containers". */
    subDiscipline: z.string().nullable(),
    status: CourseStatus,
    deliveryType: DeliveryType,
    platform: Platform.nullable(),
    /** Online courses: the connection link. In-person courses: null. */
    platformUrl: z.string().url().nullable(),
    /** In-person courses: the room or external venue. Online courses: null. */
    location: z.string().nullable(),
    isMandatory: z.boolean(),
    isInternal: z.boolean(),
    /** Total training hours across all sessions. */
    totalHours: z.number().nonnegative(),
    /** Lightweight session date summary for cards/calendar (full sessions via the sessions endpoint). */
    sessions: z.array(z.object({ startsAt: IsoDateTime, endsAt: IsoDateTime })).default([]),
    /** Budget-sensitive: masked for non-HR roles (plan §2.4). May be absent from the DTO. */
    price: z.number().nonnegative().nullable().optional(),
    /** Total seat cap. `null` = unlimited (always the case for online courses). */
    capacity: z.number().int().positive().nullable(),
    /** Max seats a single manager may fill for this course (`null` = no per-manager cap). */
    perManagerLimit: z.number().int().positive().nullable().default(null),
    /** Registration constraints (requirement #9). */
    excludeSubcontractors: z.boolean().default(false),
    excludeStudents: z.boolean().default(false),
    /** If non-empty, only these teams/groups may register (requirement #8). */
    restrictedTeams: z.array(z.string()).default([]),
    selfRegistration: SelfRegistrationPolicy,
    ownerId: EmployeeId.nullable(),
    /** The quarterly cycle this course belongs to, if any (bidding/registration lifecycle). */
    cycleId: CycleId.nullable().default(null),
    /** State within its cycle's workflow (`catalog` for ad-hoc courses). */
    lifecycleState: CourseLifecycleState.default('catalog'),
  })
  .refine(
    (c) => c.deliveryType === 'online' || (c.platform === null && c.platformUrl === null),
    'platform/platformUrl are only valid for online courses',
  )
  .refine(
    (c) => c.deliveryType !== 'online' || c.capacity === null,
    'online courses have unlimited seats (capacity must be null)',
  );
export type Course = z.infer<typeof Course>;

/** Shared field set for course create/update (refinements applied per-operation below). */
const CourseInputBase = z.object({
  seriesId: CourseSeriesId.nullable().optional(),
  title: z.string().min(1),
  year: Year,
  descriptionHtml: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  mailText: z.string().nullable().optional(),
  type: CourseType,
  discipline: z.string().nullable().optional(),
  subDiscipline: z.string().nullable().optional(),
  totalHours: z.number().nonnegative().default(0),
  deliveryType: DeliveryType,
  platform: Platform.nullable().optional(),
  /** Required for online courses (the connection link); must be null for in-person. */
  platformUrl: z.string().url().nullable().optional(),
  /** Required for in-person courses (room or external venue); must be null for online. */
  location: z.string().min(1).nullable().optional(),
  isMandatory: z.boolean().default(false),
  isInternal: z.boolean().default(true),
  price: z.number().nonnegative().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  perManagerLimit: z.number().int().positive().nullable().optional(),
  excludeSubcontractors: z.boolean().default(false),
  excludeStudents: z.boolean().default(false),
  restrictedTeams: z.array(z.string()).default([]),
  selfRegistration: SelfRegistrationPolicy.default('none'),
});

/** Input for creating a course. HR creates directly; a manager create is forced to `requested`. */
export const CreateCourseInput = CourseInputBase.refine(
  (c) => c.deliveryType !== 'online' || !!c.platformUrl,
  { message: 'online courses need a connection link (platformUrl)', path: ['platformUrl'] },
)
  .refine((c) => c.deliveryType !== 'in_person' || !!c.location, {
    message: 'in-person courses need a room or external location',
    path: ['location'],
  })
  .refine((c) => c.deliveryType !== 'online' || c.capacity == null, {
    message: 'online courses have unlimited seats (leave capacity empty)',
    path: ['capacity'],
  });
export type CreateCourseInput = z.infer<typeof CreateCourseInput>;

export const UpdateCourseInput = CourseInputBase.partial().extend({
  status: CourseStatus.optional(),
});
export type UpdateCourseInput = z.infer<typeof UpdateCourseInput>;
