import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { GoalsModule } from '../goals/goals.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [GoalsModule, EmployeesModule],
  controllers: [ReportsController],
  providers: [ReportsRepository, ReportsService],
})
export class ReportsModule {}
