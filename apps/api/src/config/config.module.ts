import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, loadConfig } from './config.js';

/** Provides the validated {@link AppConfig} app-wide under {@link APP_CONFIG}. */
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfig() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
