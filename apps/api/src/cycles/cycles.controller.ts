import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateCycleInput,
  OpenBiddingInput,
  OpenRegistrationInput,
  SetBidInput,
} from '@toma/shared';
import { z } from 'zod';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { CurrentUser, type CurrentUserInfo } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CyclesService } from './cycles.service.js';

const HR_ROLES = ['hr', 'admin', 'developer'];
const BID_ROLES = ['hr', 'admin', 'developer', 'manager'];

const DecisionInput = z.object({ decision: z.enum(['confirm', 'cancel']) });

/** Quarterly bidding / registration workflow (requirements #1, #2, #4, #6). */
@Controller()
@UseGuards(AuthenticatedGuard)
export class CyclesController {
  constructor(private readonly cycles: CyclesService) {}

  @Get('cycles')
  list(@CurrentUser() user: CurrentUserInfo) {
    this.assertHr(user);
    return this.cycles.list();
  }

  @Get('cycles/board')
  board(@CurrentUser() user: CurrentUserInfo, @Query('cycleId') cycleId?: string) {
    if (!BID_ROLES.includes(user.role)) this.forbid();
    return this.cycles.board(cycleId ? Number(cycleId) : null, caller(user));
  }

  @Post('cycles')
  @HttpCode(201)
  create(
    @CurrentUser() user: CurrentUserInfo,
    @Body(new ZodValidationPipe(CreateCycleInput)) body: CreateCycleInput,
  ) {
    this.assertHr(user);
    return this.cycles.createCycle(body.year, body.quarter);
  }

  @Post('cycles/:id/open-bidding')
  openBidding(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(OpenBiddingInput)) body: OpenBiddingInput,
  ) {
    this.assertHr(user);
    return this.cycles.openBidding(Number(id), body.biddingClosesAt, body.courseIds);
  }

  @Post('cycles/:id/open-registration')
  openRegistration(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(OpenRegistrationInput)) body: OpenRegistrationInput,
  ) {
    this.assertHr(user);
    return this.cycles.openRegistration(Number(id), body.registrationClosesAt, body.courseIds);
  }

  @Post('cycles/:id/lock')
  lock(@CurrentUser() user: CurrentUserInfo, @Param('id') id: string) {
    this.assertHr(user);
    return this.cycles.lockRegistration(Number(id));
  }

  @Post('cycles/:id/remind-bidding')
  remindBidding(@CurrentUser() user: CurrentUserInfo, @Param('id') id: string) {
    this.assertHr(user);
    return this.cycles.remindBidding(Number(id));
  }

  @Post('cycles/:id/remind-registration')
  remindRegistration(@CurrentUser() user: CurrentUserInfo, @Param('id') id: string) {
    this.assertHr(user);
    return this.cycles.remindRegistration(Number(id));
  }

  @Post('courses/:id/bid')
  @HttpCode(204)
  async setBid(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetBidInput)) body: SetBidInput,
  ) {
    if (!BID_ROLES.includes(user.role)) this.forbid();
    await this.cycles.setBid(Number(id), body.seats, caller(user));
  }

  @Get('courses/:id/bids')
  bids(@CurrentUser() user: CurrentUserInfo, @Param('id') id: string) {
    this.assertHr(user);
    return this.cycles.bidsForCourse(Number(id));
  }

  @Post('courses/:id/decision')
  decide(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(DecisionInput)) body: z.infer<typeof DecisionInput>,
  ) {
    this.assertHr(user);
    return this.cycles.decideCourse(Number(id), body.decision, caller(user));
  }

  private assertHr(user: CurrentUserInfo): void {
    if (!HR_ROLES.includes(user.role)) this.forbid();
  }
  private forbid(): never {
    throw new ForbiddenException({ error: 'Not permitted for this role' });
  }
}

function caller(user: CurrentUserInfo) {
  return { userId: user.userId, role: user.role };
}
