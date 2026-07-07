import { Injectable } from '@nestjs/common';
import type { Employee, EmployeeId } from '@toma/shared';
import { type EmployeeRecord, toEmployee } from './employee.record.js';

/**
 * In-memory stub directory used until the Prisma-backed `emma.users` projection lands (T3.2).
 * Seeds one employee per role plus a small manager→report tree so RBAC and team views are
 * demonstrable and testable end-to-end.
 */
@Injectable()
export class EmployeesRepository {
  private readonly records: EmployeeRecord[] = seed();

  findByUsername(username: string): EmployeeRecord | undefined {
    return this.records.find((r) => r.username === username);
  }

  findById(id: string): EmployeeRecord | undefined {
    return this.records.find((r) => r.id === (id as EmployeeId));
  }

  list(filter?: { query?: string; managerId?: string }): Employee[] {
    let rows = this.records;
    if (filter?.managerId) {
      rows = rows.filter((r) => r.managerId === (filter.managerId as EmployeeId));
    }
    if (filter?.query) {
      const q = filter.query.toLocaleLowerCase();
      rows = rows.filter((r) => r.fullName.toLocaleLowerCase().includes(q));
    }
    return rows.map(toEmployee);
  }
}

function record(
  id: string,
  username: string,
  role: EmployeeRecord['role'],
  firstName: string,
  lastName: string,
  managerId: string | null,
  extra: Partial<EmployeeRecord> = {},
): EmployeeRecord {
  return {
    id: id as EmployeeId,
    username,
    role,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: `${username}@example.com`,
    managerId: managerId as EmployeeId | null,
    department: extra.department ?? 'Engineering',
    title: extra.title ?? null,
    rank: extra.rank ?? null,
    category: 'SIRC',
    status: 'working',
    startDate: '2020-01-01',
    endDate: null,
    avatarUrl: null,
  };
}

function seed(): EmployeeRecord[] {
  return [
    record('1', 'alice', 'hr', 'Alice', 'Cohen', null, { title: 'HR Lead', department: 'HR' }),
    record('2', 'bob', 'manager', 'Bob', 'Levi', '1', { title: 'Team Lead', rank: 3 }),
    record('3', 'carol', 'employee', 'Carol', 'Mizrahi', '2'),
    record('4', 'dave', 'employee', 'Dave', 'Peretz', '2'),
    record('5', 'admin', 'admin', 'Ada', 'Admin', null, { department: 'IT' }),
    record('6', 'devuser', 'developer', 'Dana', 'Dev', null, { department: 'IT' }),
  ];
}
