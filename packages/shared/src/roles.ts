import { z } from 'zod';

/**
 * The five TOMA roles (plan §2.4). Enforced server-side per endpoint AND per field.
 * Route guards on the client are cosmetic only.
 */
export const Role = z.enum(['admin', 'developer', 'hr', 'manager', 'employee']);
export type Role = z.infer<typeof Role>;

export const ROLES = Role.options;

/**
 * Legacy `emma.users.authorizationIdCOMA` → TOMA role mapping (plan §4.6 / migration M1).
 * Admin and Developer are assigned manually post-migration; they have no legacy equivalent.
 */
export const LEGACY_AUTHORIZATION_TO_ROLE: Record<number, Role> = {
  1: 'employee', // None
  2: 'hr', // All
  3: 'manager', // PM
};

export function roleFromLegacyAuthorization(authorizationIdCOMA: number | null | undefined): Role {
  if (authorizationIdCOMA == null) return 'employee';
  return LEGACY_AUTHORIZATION_TO_ROLE[authorizationIdCOMA] ?? 'employee';
}

/**
 * Fields that must never be serialized to these roles (plan §2.4 field-level masking).
 * Budget/price data is stripped for everyone except HR (and Developer on test data).
 */
export const BUDGET_MASKED_ROLES: readonly Role[] = ['admin', 'manager', 'employee'];

export function canSeeBudgetData(role: Role): boolean {
  return role === 'hr' || role === 'developer';
}
