import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CyclesController } from './cycles.controller.js';
import { CyclesRepository } from './cycles.repository.js';
import { CyclesService } from './cycles.service.js';

@Module({
  imports: [CoursesModule, EmployeesModule, NotificationsModule],
  controllers: [CyclesController],
  providers: [CyclesRepository, CyclesService],
  exports: [CyclesRepository, CyclesService],
})
export class CyclesModule {}
