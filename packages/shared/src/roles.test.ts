import { describe, expect, it } from 'vitest';
import { canSeeBudgetData, roleFromLegacyAuthorization } from './roles.js';
import { DEFAULT_NOTIFICATION_RULES } from './notification.js';
import { Course } from './course.js';

describe('legacy authorization mapping', () => {
  it('maps the three legacy levels', () => {
    expect(roleFromLegacyAuthorization(1)).toBe('employee');
    expect(roleFromLegacyAuthorization(2)).toBe('hr');
    expect(roleFromLegacyAuthorization(3)).toBe('manager');
  });

  it('defaults unknown/missing levels to employee', () => {
    expect(roleFromLegacyAuthorization(null)).toBe('employee');
    expect(roleFromLegacyAuthorization(99)).toBe('employee');
  });
});

describe('budget masking', () => {
  it('only HR and Developer see budget data', () => {
    expect(canSeeBudgetData('hr')).toBe(true);
    expect(canSeeBudgetData('developer')).toBe(true);
    expect(canSeeBudgetData('admin')).toBe(false);
    expect(canSeeBudgetData('manager')).toBe(false);
    expect(canSeeBudgetData('employee')).toBe(false);
  });
});

describe('shipped notification defaults (requirement #5)', () => {
  it('notifies manager + HR on registration_created', () => {
    const rule = DEFAULT_NOTIFICATION_RULES.find((r) => r.event === 'registration_created');
    expect(rule).toBeDefined();
    const kinds = rule?.recipientSelectors.map((s) => s.kind);
    expect(kinds).toEqual(expect.arrayContaining(['direct_manager', 'hr']));
  });
});

describe('Course platform refinement', () => {
  const base = {
    id: 1,
    seriesId: null,
    title: 'Intro to X',
    year: 2026,
    descriptionHtml: null,
    notes: null,
    mailText: null,
    type: 'technical' as const,
    discipline: 'Engineering',
    status: 'scheduled' as const,
    isMandatory: false,
    isInternal: true,
    totalHours: 8,
    sessions: [],
    capacity: null,
    selfRegistration: 'none' as const,
    ownerId: null,
  };

  it('rejects platform fields on an in-person course', () => {
    const result = Course.safeParse({
      ...base,
      deliveryType: 'in_person',
      platform: 'corporate',
      platformUrl: null,
    });
    expect(result.success).toBe(false);
  });

  it('accepts platform fields on an online course', () => {
    const result = Course.safeParse({
      ...base,
      deliveryType: 'online',
      platform: 'corporate',
      platformUrl: 'https://learn.example.com/x',
    });
    expect(result.success).toBe(true);
  });
});
