import { Injectable, NotFoundException } from '@nestjs/common';
import type { Course } from '@toma/shared';
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
}
