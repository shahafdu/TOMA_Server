import { Body, Controller, ForbiddenException, Get, Put, Query, UseGuards } from '@nestjs/common';
import { SetTrainingGoalsInput } from '@toma/shared';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { CurrentUser, type CurrentUserInfo } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { GoalsService } from './goals.service.js';

// Editing goals is an HR responsibility (like budget); everyone may read them for their dashboards.
const EDIT_ROLES = ['hr', 'admin', 'developer'];

@Controller()
@UseGuards(AuthenticatedGuard)
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get('goals')
  list(@Query('year') year?: string) {
    return this.goals.forYear(yearOf(year));
  }

  @Put('goals')
  replace(
    @CurrentUser() user: CurrentUserInfo,
    @Body(new ZodValidationPipe(SetTrainingGoalsInput)) body: SetTrainingGoalsInput,
  ) {
    if (!EDIT_ROLES.includes(user.role)) {
      throw new ForbiddenException({ error: 'Not permitted for this role' });
    }
    return this.goals.replace(body);
  }
}

function yearOf(year?: string): number {
  return Number(year) || new Date().getFullYear();
}
