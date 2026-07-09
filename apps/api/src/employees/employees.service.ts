import { Injectable, NotFoundException } from '@nestjs/common';
import type { Employee, PriorParticipation } from '@toma/shared';
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

  async list(q: ListEmployeesQuery) {
    const all = await this.repo.list({ query: q.query, managerId: q.managerId });
    const start = (q.page - 1) * q.pageSize;
    return {
      items: all.slice(start, start + q.pageSize),
      total: all.length,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  async getById(id: string): Promise<Employee> {
    const employee = await this.repo.findById(id);
    if (!employee) throw new NotFoundException({ error: 'No such employee' });
    return employee;
  }

  /** Multi-year training history (requirement #4). */
  async getHistory(id: string): Promise<PriorParticipation[]> {
    await this.getById(id); // 404 if unknown
    return this.repo.history(id);
  }
}
