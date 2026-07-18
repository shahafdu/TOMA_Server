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

/**
 * Actual training hours in one discipline versus that discipline's yearly goal, for a single
 * person. `goalHours` is 0 when no goal is set for the discipline; `metGoal` is true when the
 * goal is 0 (nothing required) or actual >= goal.
 */
export const DisciplineProgress = z.object({
  discipline: z.string(),
  actualHours: z.number().nonnegative(),
  goalHours: z.number().nonnegative(),
  metGoal: z.boolean(),
});
export type DisciplineProgress = z.infer<typeof DisciplineProgress>;

/** Personal training summary for the signed-in user (the "my view", requirement from §2.6). */
export const MyTraining = z.object({
  employeeId: EmployeeId,
  year: z.number().int(),
  hours: z.number().nonnegative(),
  targetHours: z.number().nonnegative(),
  registeredCount: z.number().int().nonnegative(),
  required: z.array(RequiredCourse),
  /** Per-discipline actual hours vs. the yearly discipline goal. */
  byDiscipline: z.array(DisciplineProgress),
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

/** One registered person on one course, and whether they actually attended (requirement #10). */
export const AttendanceEntry = z.object({
  employeeId: EmployeeId,
  employeeName: z.string(),
  department: z.string().nullable(),
  courseId: CourseId,
  courseTitle: z.string(),
  discipline: z.string().nullable(),
  registrationStatus: z.string(),
  attended: z.boolean(),
});
export type AttendanceEntry = z.infer<typeof AttendanceEntry>;

/**
 * Attendance rollup: did the caller's registered people actually attend (requirement #10)?
 * scope=team is a manager's org subtree; scope=organization is HR's whole-company list.
 */
export const AttendanceReport = z.object({
  year: z.number().int(),
  scope: z.enum(['organization', 'team']),
  totalRegistrations: z.number().int().nonnegative(),
  attendedCount: z.number().int().nonnegative(),
  entries: z.array(AttendanceEntry),
});
export type AttendanceReport = z.infer<typeof AttendanceReport>;

/** One person's training rollup within a manager's/HR's scope (the per-employee roster row). */
export const MemberTraining = z.object({
  employeeId: EmployeeId,
  employeeName: z.string(),
  department: z.string().nullable(),
  managerId: EmployeeId.nullable(),
  totalHours: z.number().nonnegative(),
  mandatoryDone: z.number().int().nonnegative(),
  mandatoryTotal: z.number().int().nonnegative(),
  /** Distinct non-mandatory ("elective"/development) courses the person actually attended. */
  electiveCount: z.number().int().nonnegative(),
  byDiscipline: z.array(DisciplineProgress),
});
export type MemberTraining = z.infer<typeof MemberTraining>;

/** Aggregate attainment of one discipline's goal across a group of people. */
export const DisciplineAttainment = z.object({
  discipline: z.string(),
  goalHours: z.number().nonnegative(),
  avgHours: z.number().nonnegative(),
  peopleMet: z.number().int().nonnegative(),
  totalPeople: z.number().int().nonnegative(),
});
export type DisciplineAttainment = z.infer<typeof DisciplineAttainment>;

/**
 * Development view for a scope of people (team = a manager's full org subtree; organization = HR).
 * Surfaces non-mandatory ("elective") attendance alongside per-discipline goal attainment and a
 * comfortable per-person roster, complementing the mandatory-only {@link ComplianceReport}.
 */
export const TeamDevelopmentReport = z.object({
  year: z.number().int(),
  scope: z.enum(['organization', 'team']),
  totalPeople: z.number().int().nonnegative(),
  /** How many people attended at least one non-mandatory course. */
  peopleWithElectives: z.number().int().nonnegative(),
  /** Total distinct non-mandatory course attendances across the scope. */
  electiveAttendances: z.number().int().nonnegative(),
  disciplines: z.array(DisciplineAttainment),
  members: z.array(MemberTraining),
});
export type TeamDevelopmentReport = z.infer<typeof TeamDevelopmentReport>;

/** Yearly training budget vs committed spend, for HR (plan §2.6). Budget-sensitive → HR/admin only. */
export const BudgetReport = z.object({
  year: z.number().int(),
  budget: z.number().nonnegative(),
  committed: z.number().nonnegative(),
  byDiscipline: z.array(z.object({ discipline: z.string(), amount: z.number().nonnegative() })),
});
export type BudgetReport = z.infer<typeof BudgetReport>;
