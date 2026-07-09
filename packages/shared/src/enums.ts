import { z } from 'zod';

/** Course subject classification (legacy `CourseType` + `IsConference`, normalized). */
export const CourseType = z.enum(['technical', 'enrichment', 'conference']);
export type CourseType = z.infer<typeof CourseType>;

/**
 * Course lifecycle (plan §2.3). `requested` is a manager suggestion awaiting HR;
 * `tentative` preserves the legacy planning concept.
 */
export const CourseStatus = z.enum([
  'requested',
  'tentative',
  'scheduled',
  'completed',
  'cancelled',
  'archived',
]);
export type CourseStatus = z.infer<typeof CourseStatus>;

/** Delivery medium (plan §2.3.1). Orthogonal to lecturer sourcing. */
export const DeliveryType = z.enum(['in_person', 'online']);
export type DeliveryType = z.infer<typeof DeliveryType>;

/** For online courses: corporate learning platform vs. any other platform. */
export const Platform = z.enum(['corporate', 'other']);
export type Platform = z.infer<typeof Platform>;

/** Whether and how employees may self-register (plan §2.3 / requirement #1). */
export const SelfRegistrationPolicy = z.enum(['none', 'open', 'approval_required']);
export type SelfRegistrationPolicy = z.infer<typeof SelfRegistrationPolicy>;

/** Registration lifecycle (plan §2.3). */
export const RegistrationStatus = z.enum([
  'invited',
  'pending_approval',
  'registered',
  'waitlisted',
  'declined',
  'cancelled',
]);
export type RegistrationStatus = z.infer<typeof RegistrationStatus>;

/** Who initiated a registration. */
export const RegistrationSource = z.enum(['hr', 'manager', 'self']);
export type RegistrationSource = z.infer<typeof RegistrationSource>;

/** Employment status as fed from Workday into `emma.users.status`. */
export const EmployeeStatus = z.enum(['working', 'left', 'deleted']);
export type EmployeeStatus = z.infer<typeof EmployeeStatus>;

/** Calendar quarter 1..4 (bidding/registration lifecycle epic). */
export const Quarter = z.number().int().min(1).max(4);
export type Quarter = z.infer<typeof Quarter>;

/** Phase of a quarterly training cycle. */
export const CycleStatus = z.enum(['draft', 'bidding', 'registration', 'locked', 'completed']);
export type CycleStatus = z.infer<typeof CycleStatus>;

/** A course's state within its quarterly cycle's workflow. */
export const CourseLifecycleState = z.enum([
  'catalog', // ad-hoc catalog course, not part of a managed cycle
  'candidate', // added to a cycle, bidding not yet open
  'bidding', // managers are bidding seats
  'open', // HR opened it for active registration
  'locked', // registration deadline passed — HR-only changes
  'confirmed', // HR confirmed it runs
  'rejected', // HR cancelled it (too few participants)
]);
export type CourseLifecycleState = z.infer<typeof CourseLifecycleState>;

/** No-show justification lifecycle (requirement #9). */
export const JustificationStatus = z.enum(['requested', 'submitted', 'accepted', 'rejected']);
export type JustificationStatus = z.infer<typeof JustificationStatus>;
