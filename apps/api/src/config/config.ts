export type AuthProviderKind = 'dev' | 'ldap';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  /** Which authentication provider to use. `dev` is refused in production (plan §2.5). */
  authProvider: AuthProviderKind;
  sessionSecret: string;
  /** Whether Developer-role logins are accepted (false in production, plan §2.4). */
  allowDeveloperRole: boolean;
  /** Connection to the `coma` database; `emma` is reached via qualified names on the same server. */
  db: DbConfig;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = (env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development';
  const authProvider = (env.AUTH_PROVIDER as AuthProviderKind) ?? 'dev';

  // Hard safety rail: the dev auth provider (which trusts a username with no password) must
  // never run in production. Fail fast at boot rather than expose a bypass.
  if (nodeEnv === 'production' && authProvider === 'dev') {
    throw new Error(
      'AUTH_PROVIDER=dev is not allowed when NODE_ENV=production. Configure a real provider.',
    );
  }
  if (nodeEnv === 'production' && !env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required when NODE_ENV=production.');
  }

  return {
    nodeEnv,
    port: Number(env.PORT ?? 3000),
    authProvider,
    sessionSecret: env.SESSION_SECRET ?? (nodeEnv === 'production' ? '' : 'dev-insecure-secret'),
    allowDeveloperRole: nodeEnv !== 'production',
    db: {
      host: env.MARIADB_HOST ?? '127.0.0.1',
      port: Number(env.MARIADB_PORT ?? 3306),
      user: env.MARIADB_USER ?? 'toma',
      password: env.MARIADB_PASSWORD ?? 'toma',
      database: env.MARIADB_DATABASE ?? 'coma',
    },
  };
}
