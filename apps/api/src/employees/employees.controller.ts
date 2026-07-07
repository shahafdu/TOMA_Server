import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { RolesGuard } from '../rbac/roles.guard.js';
import { Roles } from '../rbac/roles.decorator.js';
import { EmployeesService } from './employees.service.js';

@Controller('employees')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @Roles('hr', 'admin', 'developer', 'manager')
  list(
    @Query('query') query?: string,
    @Query('managerId') managerId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '25',
  ) {
    return this.employees.list({
      query,
      managerId,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(200, Math.max(1, Number(pageSize) || 25)),
    });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.employees.getById(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.employees.getHistory(id);
  }
}
