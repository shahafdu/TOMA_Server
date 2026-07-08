import { z } from 'zod';
import { CourseId, EmployeeId } from './ids.js';

/** Curated disciplines shipped as suggestions; HR may use any string (plan §2.6). */
export const KNOWN_DISCIPLINES = [
  'Engineering',
  'Data & AI',
  'Cloud & Infra',
  'Security & Compliance',
  'Leadership',
  'Product & Design',
  'Soft Skills',
] as const;

/** One mandatory course and whether the current user has completed (attended) it. */
export const RequiredCourse = z.object({
  courseId: CourseId,
  title: z.string(),
  discipline: z.string().nullable(),
  completed: z.boolean(),
});
export type RequiredCourse = z.infer<typeof RequiredCourse>;

/** Personal training summary for the signed-in user (the "my view", requirement from §2.6). */
export const MyTraining = z.object({
  employeeId: EmployeeId,
  year: z.number().int(),
  hours: z.number().nonnegative(),
  targetHours: z.number().nonnegative(),
  registeredCount: z.number().int().nonnegative(),
  required: z.array(RequiredCourse),
});
export type MyTraining = z.infer<typeof MyTraining>;

/** Per-course completion within the caller's scope (team for managers, org for HR). */
export const ComplianceCourse = z.object({
  courseId: CourseId,
  title: z.string(),
  discipline: z.string().nullable(),
  total: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  rate: z.number().min(0).max(1),
});
export type ComplianceCourse = z.infer<typeof ComplianceCourse>;

/** Mandatory-training compliance for a scope of people (requirement #5 / plan §5 item 4). */
export const ComplianceReport = z.object({
  year: z.number().int(),
  scope: z.enum(['organization', 'team']),
  totalPeople: z.number().int().nonnegative(),
  overallRate: z.number().min(0).max(1),
  courses: z.array(ComplianceCourse),
});
export type ComplianceReport = z.infer<typeof ComplianceReport>;
