import { Controller, Get, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Course, CourseId, CourseSeriesId, Year } from '@toma/shared';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { BudgetMaskingInterceptor } from '../rbac/budget-masking.interceptor.js';

/**
 * Stub courses endpoint (real implementation lands in T3.6). Present now to exercise the
 * budget-masking interceptor: `price` is returned to HR/Developer and stripped for everyone else.
 */
@Controller('courses')
@UseGuards(AuthenticatedGuard)
@UseInterceptors(BudgetMaskingInterceptor)
export class CoursesController {
  private readonly courses: Course[] = [
    {
      id: 101 as CourseId,
      seriesId: 1 as CourseSeriesId,
      title: 'Intro to TypeScript',
      year: 2026 as Year,
      descriptionHtml: null,
      notes: null,
      mailText: null,
      type: 'technical',
      status: 'scheduled',
      deliveryType: 'in_person',
      platform: null,
      platformUrl: null,
      isMandatory: false,
      isInternal: true,
      price: 4500,
      capacity: 20,
      selfRegistration: 'open',
      ownerId: null,
    },
  ];

  @Get()
  list(): Course[] {
    return this.courses;
  }

  @Get(':id')
  getById(@Param('id') id: string): Course | undefined {
    return this.courses.find((c) => c.id === Number(id));
  }
}
