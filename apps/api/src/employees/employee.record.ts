import type { Employee, Role } from '@toma/shared';

/**
 * Internal employee record for the in-memory stub directory. Extends the public {@link Employee}
 * with fields that never leave the API as-is: the login `username` and the assigned `role`.
 * Replaced by the Prisma-backed `emma.users` projection in task T3.2.
 */
export interface EmployeeRecord extends Employee {
  username: string;
  role: Role;
}

export function toEmployee(record: EmployeeRecord): Employee {
  // Strip the internal-only fields.
  const { username: _username, role: _role, ...employee } = record;
  return employee;
}
