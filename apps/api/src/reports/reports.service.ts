import { Injectable } from '@nestjs/common';
import {
  type ComplianceReport,
  ComplianceReport as ComplianceReportSchema,
  type MyTraining,
  MyTraining as MyTrainingSchema,
} from '@toma/shared';
import { normalizeCourseName } from '../util/course-name.js';
import { ReportsRepository } from './reports.repository.js';

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  /** Mandatory-training compliance for a scope: `team` = the caller's full org subtree; `organization` = all. */
  async compliance(
    scope: ComplianceReport['scope'],
    userId: string,
    year: number,
  ): Promise<ComplianceReport> {
    const eligible =
      scope === 'team' ? await this.repo.subtreeIds(userId) : await this.repo.allWorkingIds();
    const total = eligible.length;

    const mandatory = await this.repo.mandatoryCourses(year);
    const courses = await Promise.all(
      mandatory.map(async (m) => {
        const completed = await this.repo.completedCount(m.CourseID, eligible);
        return {
          courseId: m.CourseID,
          title: normalizeCourseName(m.CourseName),
          discipline: m.Discipline,
          total,
          completed,
          rate: total > 0 ? completed / total : 0,
        };
      }),
    );

    const overallRate =
      courses.length > 0 ? courses.reduce((sum, c) => sum + c.rate, 0) / courses.length : 1;

    return ComplianceReportSchema.parse({ year, scope, totalPeople: total, overallRate, courses });
  }

  /** The signed-in user's personal training summary (hours + required-course checklist). */
  async myTraining(userId: string, year: number): Promise<MyTraining> {
    const [hours, targetHours, registeredCount, mandatory] = await Promise.all([
      this.repo.educationHours(userId, year),
      this.repo.targetHours(year),
      this.repo.registeredCount(userId, year),
      this.repo.mandatoryCourses(year),
    ]);

    const required = await Promise.all(
      mandatory.map(async (m) => ({
        courseId: m.CourseID,
        title: normalizeCourseName(m.CourseName),
        discipline: m.Discipline,
        completed: await this.repo.hasAttended(m.CourseID, userId),
      })),
    );

    return MyTrainingSchema.parse({
      employeeId: userId,
      year,
      hours,
      targetHours,
      registeredCount,
      required,
    });
  }
}
