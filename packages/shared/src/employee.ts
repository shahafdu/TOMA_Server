import { z } from 'zod';
import { EmployeeId } from './ids.js';
import { Email, IsoDate } from './common.js';
import { EmployeeStatus } from './enums.js';

/**
 * Employee — sourced read-only from `emma.users` (fed from Workday; plan §4.8).
 * TOMA never writes this; it is projected into the domain and field-masked per role.
 *
 * Quirks carried from the source and handled in the API's data layer:
 * - `id` (sircID) is the TOMA key; a separate legacy `ID` also exists in emma.
 * - deleted employees have a timestamp-suffixed id in the source.
 * - `department` derives from `teamName`, which is stored as `(TeamName)` with parentheses.
 * - `rank` 1..8 drives the notification `manager_title` selector.
 */
export const Employee = z.object({
  id: EmployeeId,
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  email: Email.nullable(),
  managerId: EmployeeId.nullable(),
  department: z.string().nullable(),
  title: z.string().nullable(),
  rank: z.number().int().min(1).max(8).nullable(),
  category: z.string().nullable(),
  /** High-level professional discipline (from Emma; 'General' when the source has none). */
  discipline: z.string(),
  status: EmployeeStatus,
  startDate: IsoDate.nullable(),
  endDate: IsoDate.nullable(),
  avatarUrl: z.string().nullable(),
});
export type Employee = z.infer<typeof Employee>;

/** Compact shape for pickers, rosters, and team lists. */
export const EmployeeSummary = Employee.pick({
  id: true,
  fullName: true,
  email: true,
  department: true,
  title: true,
  managerId: true,
  category: true,
  discipline: true,
  status: true,
});
export type EmployeeSummary = z.infer<typeof EmployeeSummary>;
