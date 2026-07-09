import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  MarkAttendanceInput,
  ReviewJustificationInput,
  SubmitJustificationInput,
} from '@toma/shared';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { CurrentUser, type CurrentUserInfo } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AttendanceService } from './attendance.service.js';

const HR_ROLES = ['hr', 'admin', 'developer'];

/** Per-day attendance entry and the no-show justification workflow (requirement #9). */
@Controller()
@UseGuards(AuthenticatedGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('courses/:id/attendance-grid')
  grid(@CurrentUser() user: CurrentUserInfo, @Param('id') id: string) {
    if (!HR_ROLES.includes(user.role)) this.forbid();
    return this.attendance.grid(Number(id));
  }

  @Put('courses/:id/attendance')
  @HttpCode(204)
  async mark(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(MarkAttendanceInput)) body: MarkAttendanceInput,
  ) {
    if (!HR_ROLES.includes(user.role)) this.forbid();
    await this.attendance.mark(Number(id), body);
  }

  @Get('justifications')
  justifications(@CurrentUser() user: CurrentUserInfo) {
    return this.attendance.justifications(caller(user));
  }

  @Post('justifications/:id/submit')
  submit(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SubmitJustificationInput)) body: SubmitJustificationInput,
  ) {
    return this.attendance.submit(Number(id), body.reason, caller(user));
  }

  @Post('justifications/:id/review')
  review(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReviewJustificationInput)) body: ReviewJustificationInput,
  ) {
    return this.attendance.review(Number(id), body.decision, caller(user));
  }

  private forbid(): never {
    throw new ForbiddenException({ error: 'Not permitted for this role' });
  }
}

function caller(user: CurrentUserInfo) {
  return { userId: user.userId, role: user.role };
}
