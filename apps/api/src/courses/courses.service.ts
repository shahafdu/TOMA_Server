import { Injectable, NotFoundException } from '@nestjs/common';
import type { Course, CourseSession, EmployeeSummary } from '@toma/shared';
import { CoursesRepository } from './courses.repository.js';

@Injectable()
export class CoursesService {
  constructor(private readonly repo: CoursesRepository) {}

  list(year: number): Promise<Course[]> {
    return this.repo.list(year);
  }

  async getById(id: number): Promise<Course> {
    const course = await this.repo.findById(id);
    if (!course) throw new NotFoundException({ error: 'No such course' });
    return course;
  }

  async sessions(id: number): Promise<CourseSession[]> {
    await this.getById(id);
    return this.repo.sessions(id);
  }

  async participants(id: number): Promise<EmployeeSummary[]> {
    await this.getById(id);
    return this.repo.participants(id);
  }
}
