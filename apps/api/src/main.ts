import 'reflect-metadata';
import { createApp } from './app.factory.js';
import { APP_CONFIG, type AppConfig } from './config/config.js';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.port);
}

void bootstrap();
