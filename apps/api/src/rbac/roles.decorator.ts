import { SetMetadata } from '@nestjs/common';
import type { Role } from '@toma/shared';

export const ROLES_KEY = 'toma:roles';

/** Restrict a route to the given roles. Enforced server-side by {@link RolesGuard}. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
