import { z } from 'zod';
import { IsoDateTime } from './common.js';
import { CycleStatus, JustificationStatus, Quarter } from './enums.js';
import { CourseId, CycleId, EmployeeId, JustificationId, Year } from './ids.js';

/**
 * TrainingCycle — one managed quarter of the bidding → registration → attendance workflow.
 * The cycle status drives which phase every candidate course is in; the two deadlines are shown
 * on the bidding and registration forms respectively.
 */
export const TrainingCycle = z.object({
  id: CycleId,
  year: Year,
  quarter: Quarter,
  status: CycleStatus,
  biddingClosesAt: IsoDateTime.nullable(),
  registrationClosesAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type TrainingCycle = z.infer<typeof TrainingCycle>;

export const CreateCycleInput = z.object({
  year: Year,
  quarter: Quarter,
});
export type CreateCycleInput = z.infer<typeof CreateCycleInput>;

/** HR opens bidding for a cycle, setting the bid deadline shown to managers (requirement #1). */
export const OpenBiddingInput = z.object({
  biddingClosesAt: IsoDateTime,
  courseIds: z.array(CourseId).min(1),
});
export type OpenBiddingInput = z.infer<typeof OpenBiddingInput>;

/** HR opens registration for the courses it chose to run, with a lock deadline (requirement #2). */
export const OpenRegistrationInput = z.object({
  registrationClosesAt: IsoDateTime,
  courseIds: z.array(CourseId).min(1),
});
export type OpenRegistrationInput = z.infer<typeof OpenRegistrationInput>;

/** A manager's bid: how many of their people they want on a candidate course (requirement #1). */
export const CourseBid = z.object({
  courseId: CourseId,
  managerId: EmployeeId,
  managerName: z.string(),
  seats: z.number().int().nonnegative(),
  updatedAt: IsoDateTime,
});
export type CourseBid = z.infer<typeof CourseBid>;

export const SetBidInput = z.object({
  seats: z.number().int().nonnegative(),
});
export type SetBidInput = z.infer<typeof SetBidInput>;

/** A candidate course inside a cycle, with the caller's own bid and the aggregate demand. */
export const CycleCourse = z.object({
  courseId: CourseId,
  title: z.string(),
  discipline: z.string().nullable(),
  lifecycleState: z.string(),
  capacity: z.number().int().nullable(),
  totalBidSeats: z.number().int().nonnegative(),
  registeredCount: z.number().int().nonnegative(),
  waitlistedCount: z.number().int().nonnegative(),
  myBidSeats: z.number().int().nonnegative().nullable(),
});
export type CycleCourse = z.infer<typeof CycleCourse>;

/** The bidding/registration board for a cycle, scoped to the caller (manager bids / HR review). */
export const CycleBoard = z.object({
  cycle: TrainingCycle,
  courses: z.array(CycleCourse),
});
export type CycleBoard = z.infer<typeof CycleBoard>;

/** A no-show justification request/response (requirement #9). */
export const AttendanceJustification = z.object({
  id: JustificationId,
  courseId: CourseId,
  courseTitle: z.string(),
  employeeId: EmployeeId,
  employeeName: z.string(),
  sessionDate: z.string().nullable(),
  reason: z.string().nullable(),
  status: JustificationStatus,
  createdAt: IsoDateTime,
});
export type AttendanceJustification = z.infer<typeof AttendanceJustification>;

export const SubmitJustificationInput = z.object({
  reason: z.string().min(1),
});
export type SubmitJustificationInput = z.infer<typeof SubmitJustificationInput>;

export const ReviewJustificationInput = z.object({
  decision: z.enum(['accept', 'reject']),
});
export type ReviewJustificationInput = z.infer<typeof ReviewJustificationInput>;
