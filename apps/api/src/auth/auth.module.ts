import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { APP_CONFIG, type AppConfig } from '../config/config.js';
import { AUTH_PROVIDER } from './auth.provider.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { DevAuthProvider } from './dev-auth.provider.js';

/**
 * Wires the configured auth provider behind {@link AUTH_PROVIDER}. Today only DevAuth exists;
 * an LDAP/ADFS provider is added here (a factory branch on `config.authProvider`) when the
 * deferred decision lands (plan T0.2) — no other module changes.
 */
@Module({
  imports: [EmployeesModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    DevAuthProvider,
    {
      provide: AUTH_PROVIDER,
      useFactory: (config: AppConfig, dev: DevAuthProvider) => {
        switch (config.authProvider) {
          case 'dev':
            return dev;
          case 'ldap':
            throw new Error('LDAP auth provider not implemented yet (plan T0.2).');
          default:
            throw new Error(`Unknown auth provider: ${config.authProvider}`);
        }
      },
      inject: [APP_CONFIG, DevAuthProvider],
    },
  ],
})
export class AuthModule {}
