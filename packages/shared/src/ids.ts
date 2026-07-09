import { z } from 'zod';

/**
 * Identifier conventions (provisional — confirm against the schema dump, plan T0.1):
 *
 * - `emma.users` uses VARCHAR identifiers (`ID`, `sircID`), so employee-facing ids are modelled
 *   as branded strings. TOMA keys employees on `sircID`.
 * - `coma` surrogate keys (`CourseID`, …) are integer PKs, modelled as branded numbers.
 *
 * Brands are compile-time only; at runtime these are plain strings/numbers.
 */

export const EmployeeId = z.string().min(1).brand<'EmployeeId'>();
export type EmployeeId = z.infer<typeof EmployeeId>;

export const CourseSeriesId = z.number().int().positive().brand<'CourseSeriesId'>();
export type CourseSeriesId = z.infer<typeof CourseSeriesId>;

export const CourseId = z.number().int().positive().brand<'CourseId'>();
export type CourseId = z.infer<typeof CourseId>;

export const CourseSessionId = z.number().int().positive().brand<'CourseSessionId'>();
export type CourseSessionId = z.infer<typeof CourseSessionId>;

export const RegistrationId = z.number().int().positive().brand<'RegistrationId'>();
export type RegistrationId = z.infer<typeof RegistrationId>;

export const TrainingProviderId = z.number().int().positive().brand<'TrainingProviderId'>();
export type TrainingProviderId = z.infer<typeof TrainingProviderId>;

export const ExternalLecturerId = z.number().int().positive().brand<'ExternalLecturerId'>();
export type ExternalLecturerId = z.infer<typeof ExternalLecturerId>;

export const NotificationRuleId = z.number().int().positive().brand<'NotificationRuleId'>();
export type NotificationRuleId = z.infer<typeof NotificationRuleId>;

export const CycleId = z.number().int().positive().brand<'CycleId'>();
export type CycleId = z.infer<typeof CycleId>;

export const JustificationId = z.number().int().positive().brand<'JustificationId'>();
export type JustificationId = z.infer<typeof JustificationId>;

/** A calendar year, e.g. 2026. Used pervasively by the legacy per-year data model. */
export const Year = z.number().int().gte(2000).lte(2100).brand<'Year'>();
export type Year = z.infer<typeof Year>;
