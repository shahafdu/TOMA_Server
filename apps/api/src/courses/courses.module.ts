import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { CoursesRepository } from './courses.repository.js';
import { CoursesService } from './courses.service.js';

@Module({
  controllers: [CoursesController],
  providers: [CoursesRepository, CoursesService],
  exports: [CoursesRepository],
})
export class CoursesModule {}
