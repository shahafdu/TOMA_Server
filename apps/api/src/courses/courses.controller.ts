import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { BudgetMaskingInterceptor } from '../rbac/budget-masking.interceptor.js';
import { Roles } from '../rbac/roles.decorator.js';
import { RolesGuard } from '../rbac/roles.guard.js';
import { CoursesService } from './courses.service.js';

/**
 * Courses read endpoints backed by the DB. The budget-masking interceptor strips `price` for
 * roles that may not see budget data (plan §2.4); write endpoints land in T3.6.
 */
@Controller('courses')
@UseGuards(AuthenticatedGuard)
@UseInterceptors(BudgetMaskingInterceptor)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@Query('year') year?: string) {
    const y = Number(year) || new Date().getFullYear();
    return this.courses.list(y);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.courses.getById(Number(id));
  }

  @Get(':id/sessions')
  sessions(@Param('id') id: string) {
    return this.courses.sessions(Number(id));
  }

  @Get(':id/participants')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin', 'developer', 'manager')
  participants(@Param('id') id: string) {
    return this.courses.participants(Number(id));
  }
}
