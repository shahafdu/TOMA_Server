import { Injectable } from '@nestjs/common';
import {
  type AttendanceReport,
  AttendanceReport as AttendanceReportSchema,
  type BudgetReport,
  BudgetReport as BudgetReportSchema,
  type ComplianceReport,
  ComplianceReport as ComplianceReportSchema,
  type DisciplineProgress,
  type MemberTraining,
  type MyTraining,
  MyTraining as MyTrainingSchema,
  type TeamDevelopmentReport,
  TeamDevelopmentReport as TeamDevelopmentReportSchema,
} from '@toma/shared';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { GoalsRepository } from '../goals/goals.repository.js';
import { normalizeCourseName } from '../util/course-name.js';
import { ReportsRepository } from './reports.repository.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly repo: ReportsRepository,
    private readonly goals: GoalsRepository,
    private readonly employees: EmployeesRepository,
  ) {}

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

  /** The signed-in user's personal training summary (hours + required-course checklist + goals). */
  async myTraining(userId: string, year: number): Promise<MyTraining> {
    const [hours, targetHours, registeredCount, mandatory, attended, goals] = await Promise.all([
      this.repo.educationHours(userId, year),
      this.repo.targetHours(year),
      this.repo.registeredCount(userId, year),
      this.repo.mandatoryCourses(year),
      this.repo.attendedCourseHours([Number(userId)], year),
      this.goals.forYear(year),
    ]);

    const required = await Promise.all(
      mandatory.map(async (m) => ({
        courseId: m.CourseID,
        title: normalizeCourseName(m.CourseName),
        discipline: m.Discipline,
        completed: await this.repo.hasAttended(m.CourseID, userId),
      })),
    );

    const actualByDiscipline = new Map<string, number>();
    for (const row of attended) {
      if (!row.discipline) continue;
      actualByDiscipline.set(
        row.discipline,
        (actualByDiscipline.get(row.discipline) ?? 0) + Number(row.totalHours),
      );
    }
    const byDiscipline = buildDisciplineProgress(actualByDiscipline, goals);

    return MyTrainingSchema.parse({
      employeeId: userId,
      year,
      hours,
      targetHours,
      registeredCount,
      required,
      byDiscipline,
    });
  }

  /**
   * Development view for a scope (team = the caller's full org subtree; organization = HR/all).
   * Surfaces non-mandatory attendance and per-discipline goal attainment plus a per-person roster.
   */
  async teamDevelopment(
    scope: TeamDevelopmentReport['scope'],
    userId: string,
    year: number,
  ): Promise<TeamDevelopmentReport> {
    const members =
      scope === 'team'
        ? await this.employees.subtreeSummaries(userId)
        : await this.employees.allWorkingSummaries();
    const ids = members.map((m) => Number(m.id));

    const [attended, goals, mandatory] = await Promise.all([
      this.repo.attendedCourseHours(ids, year),
      this.goals.forYear(year),
      this.repo.mandatoryCourses(year),
    ]);
    const mandatoryTotal = mandatory.length;

    // Group attended (person, course) rows by person.
    const perPerson = new Map<number, typeof attended>();
    for (const row of attended) {
      const list = perPerson.get(row.sircID) ?? [];
      list.push(row);
      perPerson.set(row.sircID, list);
    }

    const memberRows: MemberTraining[] = members.map((m) => {
      const rows = perPerson.get(Number(m.id)) ?? [];
      let totalHours = 0;
      let mandatoryDone = 0;
      let electiveCount = 0;
      const actualByDiscipline = new Map<string, number>();
      for (const row of rows) {
        const h = Number(row.totalHours);
        totalHours += h;
        if (row.isMandatory) mandatoryDone += 1;
        else electiveCount += 1;
        if (row.discipline) {
          actualByDiscipline.set(row.discipline, (actualByDiscipline.get(row.discipline) ?? 0) + h);
        }
      }
      return {
        employeeId: m.id,
        employeeName: m.fullName,
        department: m.department,
        managerId: m.managerId,
        totalHours,
        mandatoryDone,
        mandatoryTotal,
        electiveCount,
        byDiscipline: buildDisciplineProgress(actualByDiscipline, goals),
      };
    });

    const peopleWithElectives = memberRows.filter((m) => m.electiveCount > 0).length;
    const electiveAttendances = memberRows.reduce((sum, m) => sum + m.electiveCount, 0);

    // Aggregate attainment per goal discipline across everyone in scope.
    const totalPeople = members.length;
    const disciplines = goals.map((g) => {
      let sum = 0;
      let peopleMet = 0;
      for (const m of memberRows) {
        const actual = m.byDiscipline.find((d) => d.discipline === g.discipline)?.actualHours ?? 0;
        sum += actual;
        if (g.targetHours === 0 || actual >= g.targetHours) peopleMet += 1;
      }
      return {
        discipline: g.discipline,
        goalHours: g.targetHours,
        avgHours: totalPeople > 0 ? Math.round((sum / totalPeople) * 10) / 10 : 0,
        peopleMet,
        totalPeople,
      };
    });

    return TeamDevelopmentReportSchema.parse({
      year,
      scope,
      totalPeople,
      peopleWithElectives,
      electiveAttendances,
      disciplines,
      members: memberRows,
    });
  }

  /** Attendance rollup for a scope: did the caller's registered people actually attend (#10)? */
  async attendance(
    scope: AttendanceReport['scope'],
    userId: string,
    year: number,
  ): Promise<AttendanceReport> {
    const eligible =
      scope === 'team' ? await this.repo.subtreeIds(userId) : await this.repo.allWorkingIds();
    const rows = await this.repo.attendance(eligible, year);

    const entries = rows.map((r) => ({
      employeeId: String(r.sircID),
      employeeName: `${r.firstName} ${r.lastName}`,
      department: r.teamName ? r.teamName.replace(/^\((.*)\)$/, '$1') : null,
      courseId: r.CourseID,
      courseTitle: normalizeCourseName(r.CourseName),
      discipline: r.Discipline,
      registrationStatus: r.status,
      attended: Boolean(r.attended),
    }));
    const attendedCount = entries.filter((e) => e.attended).length;

    return AttendanceReportSchema.parse({
      year,
      scope,
      totalRegistrations: entries.length,
      attendedCount,
      entries,
    });
  }

  /** Yearly training budget vs committed spend (HR/admin only — enforced in the controller). */
  async budget(year: number): Promise<BudgetReport> {
    const [budget, committed, byDiscipline] = await Promise.all([
      this.repo.yearlyBudget(year),
      this.repo.committedSpend(year),
      this.repo.spendByDiscipline(year),
    ]);
    return BudgetReportSchema.parse({ year, budget, committed, byDiscipline });
  }
}

/**
 * Merge a person's actual per-discipline hours with the yearly goals into a sorted progress list.
 * Includes the union of disciplines that have a goal and disciplines the person has hours in, so
 * both "goal not yet met" and "hours in an ungoaled discipline" are visible.
 */
function buildDisciplineProgress(
  actualByDiscipline: Map<string, number>,
  goals: { discipline: string; targetHours: number }[],
): DisciplineProgress[] {
  const goalByDiscipline = new Map(goals.map((g) => [g.discipline, g.targetHours]));
  const disciplines = new Set<string>([...goalByDiscipline.keys(), ...actualByDiscipline.keys()]);

  return [...disciplines]
    .map((discipline) => {
      const actualHours = Math.round((actualByDiscipline.get(discipline) ?? 0) * 10) / 10;
      const goalHours = goalByDiscipline.get(discipline) ?? 0;
      return {
        discipline,
        actualHours,
        goalHours,
        metGoal: goalHours === 0 || actualHours >= goalHours,
      };
    })
    .sort((a, b) => b.goalHours - a.goalHours || a.discipline.localeCompare(b.discipline));
}
