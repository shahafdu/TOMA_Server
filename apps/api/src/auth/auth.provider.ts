import type { Role } from '@toma/shared';

export interface AuthenticatedIdentity {
  userId: string;
  role: Role;
  fullName: string;
  email: string | null;
}

export interface Credentials {
  username: string;
  password?: string;
}

/**
 * The single seam all authentication goes through (plan §2.5). Swapping DevAuth for an
 * LDAP/ADFS provider touches only this interface's implementation — nothing else in the app
 * knows how a user was authenticated.
 */
export interface AuthProvider {
  authenticate(credentials: Credentials): Promise<AuthenticatedIdentity | null>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
