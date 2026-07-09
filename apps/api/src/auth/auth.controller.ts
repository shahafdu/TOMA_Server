import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { AuthService } from './auth.service.js';
import { AuthenticatedGuard } from './authenticated.guard.js';
import { CurrentUser, type CurrentUserInfo } from './current-user.decorator.js';

const LoginInput = z.object({
  username: z.string().min(1),
  password: z.string().optional(),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly employees: EmployeesRepository,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginInput)) body: z.infer<typeof LoginInput>,
    @Req() req: Request,
  ) {
    const identity = await this.auth.login(body);
    if (!identity) {
      throw new UnauthorizedException({ error: 'Invalid credentials' });
    }
    // Regenerate the session id on privilege change to prevent session fixation.
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
    req.session.userId = identity.userId;
    req.session.role = identity.role;
    // Same shape as /auth/me (incl. hasTeam) so the client caches a complete session.
    const hasTeam = await this.employees.hasReports(identity.userId);
    return {
      id: identity.userId,
      fullName: identity.fullName,
      email: identity.email,
      role: identity.role,
      hasTeam,
    };
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AuthenticatedGuard)
  async logout(@Req() req: Request): Promise<void> {
    await new Promise<void>((resolve, reject) =>
      req.session.destroy((err) => (err ? reject(err) : resolve())),
    );
  }

  @Get('me')
  @UseGuards(AuthenticatedGuard)
  async me(@CurrentUser() user: CurrentUserInfo) {
    const [employee, hasTeam] = await Promise.all([
      this.employees.findById(user.userId),
      this.employees.hasReports(user.userId),
    ]);
    return {
      id: user.userId,
      fullName: employee?.fullName ?? '',
      email: employee?.email ?? null,
      role: user.role,
      hasTeam,
    };
  }
}
