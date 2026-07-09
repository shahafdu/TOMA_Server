import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@toma/shared';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Enforces `@Roles(...)` from the session. This is the authoritative check — the client's route
 * guards are cosmetic (plan §2.4). Absent metadata means "any authenticated user".
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<Request>();
    const role = req.session?.role;
    if (!role) {
      throw new UnauthorizedException({ error: 'Not authenticated' });
    }
    if (required && required.length > 0 && !required.includes(role)) {
      throw new ForbiddenException({ error: 'Not permitted for this role' });
    }
    return true;
  }
}
