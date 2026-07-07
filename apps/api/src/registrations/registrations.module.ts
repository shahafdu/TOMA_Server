import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { RegistrationsController } from './registrations.controller.js';
import { RegistrationsRepository } from './registrations.repository.js';
import { RegistrationsService } from './registrations.service.js';

@Module({
  imports: [CoursesModule, EmployeesModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsRepository, RegistrationsService],
})
export class RegistrationsModule {}
