import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import type { ComplianceReport } from '@toma/shared';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { CurrentUser, type CurrentUserInfo } from '../auth/current-user.decorator.js';
import { ReportsService } from './reports.service.js';

const ORG_ROLES = ['hr', 'admin', 'developer'];

@Controller()
@UseGuards(AuthenticatedGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('reports/compliance')
  compliance(
    @CurrentUser() user: CurrentUserInfo,
    @Query('scope') scopeParam?: string,
    @Query('year') year?: string,
  ) {
    const scope: ComplianceReport['scope'] = scopeParam === 'team' ? 'team' : 'organization';
    // Organization-wide compliance is HR/admin only; team scope is anyone with reports.
    if (scope === 'organization' && !ORG_ROLES.includes(user.role)) {
      throw new ForbiddenException({ error: 'Not permitted for this role' });
    }
    return this.reports.compliance(scope, user.userId, yearOf(year));
  }

  @Get('me/training')
  myTraining(@CurrentUser() user: CurrentUserInfo, @Query('year') year?: string) {
    return this.reports.myTraining(user.userId, yearOf(year));
  }
}

function yearOf(year?: string): number {
  return Number(year) || new Date().getFullYear();
}
