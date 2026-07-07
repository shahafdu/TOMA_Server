import { Injectable, NotFoundException } from '@nestjs/common';
import type { RegistrationResult, RegistrationSource } from '@toma/shared';
import { CoursesRepository } from '../courses/courses.repository.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { RegistrationsRepository } from './registrations.repository.js';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly repo: RegistrationsRepository,
    private readonly courses: CoursesRepository,
    private readonly employees: EmployeesRepository,
  ) {}

  async register(
    courseId: number,
    employeeId: string,
    source: RegistrationSource,
  ): Promise<RegistrationResult> {
    await this.assertCourse(courseId);
    await this.assertEmployee(employeeId);
    return this.repo.register(courseId, employeeId, source);
  }

  async precheck(courseId: number, employeeIds: string[]): Promise<RegistrationResult[]> {
    await this.assertCourse(courseId);
    return Promise.all(employeeIds.map((id) => this.repo.precheck(courseId, id)));
  }

  private async assertCourse(courseId: number): Promise<void> {
    if (!(await this.courses.findById(courseId))) {
      throw new NotFoundException({ error: 'No such course' });
    }
  }

  private async assertEmployee(employeeId: string): Promise<void> {
    if (!(await this.employees.findById(employeeId))) {
      throw new NotFoundException({ error: 'No such employee' });
    }
  }
}
