import { Injectable } from '@nestjs/common';
import { EmployeesRepository } from '../employees/employees.repository.js';
import type { AuthenticatedIdentity, AuthProvider, Credentials } from './auth.provider.js';

/**
 * DevAuth (plan §2.5): resolves an identity from the stub directory by username with NO password
 * check. Enables all local/dev/test/CI work without an IdP. `loadConfig` refuses to boot this
 * provider when NODE_ENV=production, so it can never reach a real environment.
 */
@Injectable()
export class DevAuthProvider implements AuthProvider {
  constructor(private readonly employees: EmployeesRepository) {}

  async authenticate({ username }: Credentials): Promise<AuthenticatedIdentity | null> {
    const user = this.employees.findByUsername(username);
    if (!user) return null;
    return {
      userId: user.id,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
    };
  }
}
