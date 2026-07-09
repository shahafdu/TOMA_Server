import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@toma/shared';
import type { Request } from 'express';

export interface CurrentUserInfo {
  userId: string;
  role: Role;
}

/** Injects the authenticated user from the session, or `null` if unauthenticated. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserInfo | null => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.session?.userId || !req.session.role) return null;
    return { userId: req.session.userId, role: req.session.role };
  },
);
