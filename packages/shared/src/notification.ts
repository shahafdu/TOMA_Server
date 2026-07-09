import { z } from 'zod';
import { CourseId, CourseSeriesId, NotificationRuleId } from './ids.js';
import { Email } from './common.js';

/** Scope a rule applies at (plan §2.7). */
export const NotificationScope = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('global') }),
  z.object({ kind: z.literal('series'), seriesId: CourseSeriesId }),
  z.object({ kind: z.literal('course'), courseId: CourseId }),
]);
export type NotificationScope = z.infer<typeof NotificationScope>;

/** Domain events that can trigger notifications (plan §2.7 + bidding/registration lifecycle). */
export const NotificationEvent = z.enum([
  'registration_created',
  'self_registration_requested',
  'registration_cancelled',
  'registration_approved',
  'waitlist_promoted',
  'course_requested',
  'session_reminder',
  'attendance_missing',
  'feedback_request',
  // Quarterly bidding / registration lifecycle epic
  'bidding_opened',
  'bidding_reminder',
  'registration_opened',
  'registration_reminder',
  'registration_locked',
  'registration_confirmed',
  'course_confirmed',
  'course_cancelled',
  'course_upcoming',
  'justification_requested',
  'justification_reviewed',
]);
export type NotificationEvent = z.infer<typeof NotificationEvent>;

/** A queued/sent message in the notification outbox (the in-app stand-in for Exchange mail). */
export const NotificationMessage = z.object({
  id: z.number().int(),
  event: NotificationEvent,
  recipientId: z.string(),
  subject: z.string(),
  body: z.string(),
  courseId: CourseId.nullable(),
  cycleId: z.number().int().nullable(),
  scheduledFor: z.string(),
  sentAt: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationMessage = z.infer<typeof NotificationMessage>;

/**
 * Recipient selectors (plan §2.7). Resolved and de-duplicated at send time.
 * `manager_title` maps to emma.users.workTitle/rank; `department` to teamName/costCenter.
 */
export const RecipientSelector = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('direct_manager') }),
  z.object({ kind: z.literal('manager_title'), title: z.string().min(1) }),
  z.object({ kind: z.literal('department'), department: z.string().min(1) }),
  z.object({ kind: z.literal('hr') }),
  z.object({ kind: z.literal('course_owner') }),
  z.object({ kind: z.literal('course_lecturer') }),
  z.object({ kind: z.literal('employee') }),
  z.object({ kind: z.literal('custom_emails'), emails: z.array(Email).min(1) }),
]);
export type RecipientSelector = z.infer<typeof RecipientSelector>;

export const NotificationRule = z.object({
  id: NotificationRuleId,
  name: z.string().min(1),
  enabled: z.boolean(),
  scope: NotificationScope,
  event: NotificationEvent,
  /** For `session_reminder` — days before the first session. */
  offsetDays: z.number().int().nullable(),
  recipientSelectors: z.array(RecipientSelector).min(1),
  templateId: z.string().nullable(),
});
export type NotificationRule = z.infer<typeof NotificationRule>;

export const UpsertNotificationRuleInput = NotificationRule.omit({ id: true }).partial({
  enabled: true,
  offsetDays: true,
  templateId: true,
});
export type UpsertNotificationRuleInput = z.infer<typeof UpsertNotificationRuleInput>;

/**
 * Default rules shipped on migration (plan §2.7). Requirement #5 —
 * managers + HR are notified when an employee is registered — is satisfied out of the box.
 */
export const DEFAULT_NOTIFICATION_RULES: ReadonlyArray<
  Pick<NotificationRule, 'name' | 'enabled' | 'event' | 'offsetDays' | 'recipientSelectors'> & {
    scope: { kind: 'global' };
  }
> = [
  {
    name: 'Notify manager + HR on registration',
    enabled: true,
    scope: { kind: 'global' },
    event: 'registration_created',
    offsetDays: null,
    recipientSelectors: [{ kind: 'direct_manager' }, { kind: 'hr' }],
  },
  {
    name: 'Notify manager on self-registration request',
    enabled: true,
    scope: { kind: 'global' },
    event: 'self_registration_requested',
    offsetDays: null,
    recipientSelectors: [{ kind: 'direct_manager' }],
  },
  {
    name: 'Notify employee on waitlist promotion',
    enabled: true,
    scope: { kind: 'global' },
    event: 'waitlist_promoted',
    offsetDays: null,
    recipientSelectors: [{ kind: 'employee' }],
  },
  {
    name: 'Manager digest 30 days before a session',
    enabled: true,
    scope: { kind: 'global' },
    event: 'session_reminder',
    offsetDays: 30,
    recipientSelectors: [{ kind: 'direct_manager' }, { kind: 'hr' }],
  },
];
