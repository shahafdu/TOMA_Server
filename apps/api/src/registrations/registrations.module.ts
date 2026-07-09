import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module.js';
import { CyclesModule } from '../cycles/cycles.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RegistrationsController } from './registrations.controller.js';
import { RegistrationsRepository } from './registrations.repository.js';
import { RegistrationsService } from './registrations.service.js';

@Module({
  imports: [CoursesModule, EmployeesModule, CyclesModule, NotificationsModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsRepository, RegistrationsService],
})
export class RegistrationsModule {}
