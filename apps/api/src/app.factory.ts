import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { ProblemJsonFilter } from './common/problem-json.filter.js';
import { APP_CONFIG, type AppConfig } from './config/config.js';

/**
 * Builds and configures the Nest application. Shared by the HTTP bootstrap ({@link ./main}) and
 * the e2e tests so both exercise the exact same middleware/filters/session setup.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<AppConfig>(APP_CONFIG);

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ProblemJsonFilter());
  app.enableCors({ origin: true, credentials: true });

  app.use(
    session({
      name: 'toma.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        maxAge: 1000 * 60 * 60 * 8,
      },
    }),
  );

  return app;
}
