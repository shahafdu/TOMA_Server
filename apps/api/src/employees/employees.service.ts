import { Injectable, NotFoundException } from '@nestjs/common';
import type { Employee, PriorParticipation } from '@toma/shared';
import { toEmployee } from './employee.record.js';
import { EmployeesRepository } from './employees.repository.js';

export interface ListEmployeesQuery {
  query?: string;
  managerId?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly repo: EmployeesRepository) {}

  list(q: ListEmployeesQuery) {
    const all = this.repo.list({ query: q.query, managerId: q.managerId });
    const start = (q.page - 1) * q.pageSize;
    return {
      items: all.slice(start, start + q.pageSize),
      total: all.length,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  getById(id: string): Employee {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException({ error: 'No such employee' });
    return toEmployee(record);
  }

  /** Multi-year training history (requirement #4). Stubbed until the registrations table lands. */
  getHistory(id: string): PriorParticipation[] {
    this.getById(id); // 404 if unknown
    return [];
  }
}
