import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/config.js';
import {
  type AuthProvider,
  AUTH_PROVIDER,
  type Credentials,
  type AuthenticatedIdentity,
} from './auth.provider.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly provider: AuthProvider,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async login(credentials: Credentials): Promise<AuthenticatedIdentity | null> {
    const identity = await this.provider.authenticate(credentials);
    if (!identity) return null;

    // Developer logins are environment-scoped: accepted in dev/test, refused in production
    // (plan §2.4). The config guarantees allowDeveloperRole is false when NODE_ENV=production.
    if (identity.role === 'developer' && !this.config.allowDeveloperRole) {
      throw new ForbiddenException({
        error: 'Developer role is not permitted in this environment',
      });
    }
    return identity;
  }
}
