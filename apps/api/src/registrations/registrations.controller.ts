import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateRegistrationInput } from '@toma/shared';
import { z } from 'zod';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { CurrentUser, type CurrentUserInfo } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { RegistrationsService } from './registrations.service.js';

/** Roles that may register others / see the roster. Employees may only self-register. */
const REGISTRAR_ROLES = ['hr', 'admin', 'developer', 'manager'];

const ManageInput = z.object({ action: z.enum(['approve', 'decline', 'cancel']) });

/**
 * Registration flow (requirements #7/#8/#9). Managers/HR see a roster of eligible people with
 * live seat accounting and register/approve them; employees self-register where the course policy
 * allows it. All seat/eligibility rules are enforced server-side in {@link RegistrationsService}.
 */
@Controller('courses')
@UseGuards(AuthenticatedGuard)
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Get(':id/availability')
  availability(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.registrations.availabilityById(Number(id), user.userId);
  }

  @Get(':id/roster')
  roster(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    if (!REGISTRAR_ROLES.includes(user.role)) {
      throw new ForbiddenException({ error: 'Not permitted for this role' });
    }
    return this.registrations.roster(Number(id), { userId: user.userId, role: user.role });
  }

  @Post(':id/registrations')
  @HttpCode(201)
  register(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateRegistrationInput)) body: CreateRegistrationInput,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    // Registering someone other than yourself requires a registrar role.
    if (body.source !== 'self' && !REGISTRAR_ROLES.includes(user.role)) {
      throw new ForbiddenException({ error: 'Not permitted for this role' });
    }
    return this.registrations.register(Number(id), body.employeeId, body.source, {
      userId: user.userId,
      role: user.role,
    });
  }

  @Get(':id/registrations/precheck')
  precheck(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserInfo,
    @Query('employeeIds') employeeIds = '',
  ) {
    if (!REGISTRAR_ROLES.includes(user.role)) {
      throw new ForbiddenException({ error: 'Not permitted for this role' });
    }
    const ids = employeeIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return this.registrations.precheck(Number(id), ids);
  }

  @Patch(':id/registrations/:employeeId')
  manage(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Body(new ZodValidationPipe(ManageInput)) body: z.infer<typeof ManageInput>,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    if (!REGISTRAR_ROLES.includes(user.role)) {
      throw new ForbiddenException({ error: 'Not permitted for this role' });
    }
    return this.registrations.manage(Number(id), employeeId, body.action, {
      userId: user.userId,
      role: user.role,
    });
  }
}
