import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { CurrentUser, type CurrentUserInfo } from '../auth/current-user.decorator.js';
import { Roles } from '../rbac/roles.decorator.js';
import { RolesGuard } from '../rbac/roles.guard.js';
import { ReportsService } from './reports.service.js';

@Controller()
@UseGuards(AuthenticatedGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('reports/compliance')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin', 'developer', 'manager')
  compliance(@CurrentUser() user: CurrentUserInfo, @Query('year') year?: string) {
    return this.reports.compliance(user.role, user.userId, yearOf(year));
  }

  @Get('me/training')
  myTraining(@CurrentUser() user: CurrentUserInfo, @Query('year') year?: string) {
    return this.reports.myTraining(user.userId, yearOf(year));
  }
}

function yearOf(year?: string): number {
  return Number(year) || new Date().getFullYear();
}
