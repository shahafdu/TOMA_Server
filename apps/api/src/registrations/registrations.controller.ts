import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CreateRegistrationInput } from '@toma/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { Roles } from '../rbac/roles.decorator.js';
import { RolesGuard } from '../rbac/roles.guard.js';
import { RegistrationsService } from './registrations.service.js';

/**
 * Registration writes (requirement #4). HR/admin/manager can register employees; the response
 * surfaces the employee's prior participation in the same series and any same-day session
 * conflicts. Employee self-registration is gated on the `self_registration` course policy, which
 * arrives with migration M2 — until then it is not exposed here.
 */
@Controller('courses')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('hr', 'admin', 'developer', 'manager')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post(':id/registrations')
  @HttpCode(201)
  register(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateRegistrationInput)) body: CreateRegistrationInput,
  ) {
    return this.registrations.register(Number(id), body.employeeId, body.source);
  }

  @Get(':id/registrations/precheck')
  precheck(@Param('id') id: string, @Query('employeeIds') employeeIds = '') {
    const ids = employeeIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return this.registrations.precheck(Number(id), ids);
  }
}
