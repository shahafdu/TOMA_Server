import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [CoursesModule, EmployeesModule, NotificationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceRepository, AttendanceService],
})
export class AttendanceModule {}
