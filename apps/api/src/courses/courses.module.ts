import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';

@Module({
  controllers: [CoursesController],
})
export class CoursesModule {}
