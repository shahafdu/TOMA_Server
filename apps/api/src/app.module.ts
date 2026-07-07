import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { HealthController } from './health/health.controller.js';
import { OpenApiController } from './openapi/openapi.controller.js';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        autoLogging: process.env.NODE_ENV !== 'test',
      },
    }),
    AuthModule,
    EmployeesModule,
    CoursesModule,
  ],
  controllers: [HealthController, OpenApiController],
})
export class AppModule {}
