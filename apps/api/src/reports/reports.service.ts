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
    const [hours, targetHours, registeredCount, mandatory, attended, goals, employee] =
      await Promise.all([
        this.repo.educationHours(userId, year),
        this.repo.targetHours(year),
        this.repo.registeredCount(userId, year),
        this.repo.mandatoryCourses(year),
        this.repo.attendedCourseHours([Number(userId)], year),
        this.goals.forYear(year),
        this.employees.findById(userId),
      ]);

    const required = await Promise.all(
      mandatory.map(async (m) => ({
        courseId: m.CourseID,
        title: normalizeCourseName(m.CourseName),
        discipline: m.Discipline,
        completed: await this.repo.hasAttended(m.CourseID, userId),
      })),
    );

    const discipline = employee?.discipline ?? 'General';
    const disciplineGoalHours = goals.find((g) => g.discipline === discipline)?.targetHours ?? 0;

    return MyTrainingSchema.parse({
      employeeId: userId,
      year,
      hours,
      targetHours,
      registeredCount,
      required,
      discipline,
      disciplineGoalHours,
      byDiscipline: subjectBreakdown(attended),
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

    const [attended, goals, mandatory, totalHoursById] = await Promise.all([
      this.repo.attendedCourseHours(ids, year),
      this.goals.forYear(year),
      this.repo.mandatoryCourses(year),
      this.repo.educationHoursForScope(ids, year),
    ]);
    const mandatoryTotal = mandatory.length;
    const goalByDiscipline = new Map(goals.map((g) => [g.discipline, g.targetHours]));

    // Group attended (person, course) rows by person (drives mandatory/elective + subject split).
    const perPerson = new Map<number, typeof attended>();
    for (const row of attended) {
      const list = perPerson.get(row.sircID) ?? [];
      list.push(row);
      perPerson.set(row.sircID, list);
    }

    const memberRows: MemberTraining[] = members.map((m) => {
      const rows = perPerson.get(Number(m.id)) ?? [];
      let mandatoryDone = 0;
      let electiveCount = 0;
      for (const row of rows) {
        if (row.isMandatory) mandatoryDone += 1;
        else electiveCount += 1;
      }
      const totalHours = totalHoursById.get(Number(m.id)) ?? 0;
      const disciplineGoalHours = goalByDiscipline.get(m.discipline) ?? 0;
      return {
        employeeId: m.id,
        employeeName: m.fullName,
        department: m.department,
        managerId: m.managerId,
        discipline: m.discipline,
        totalHours,
        disciplineGoalHours,
        metGoal: disciplineGoalHours === 0 || totalHours >= disciplineGoalHours,
        mandatoryDone,
        mandatoryTotal,
        electiveCount,
        byDiscipline: subjectBreakdown(rows),
      };
    });

    const peopleWithElectives = memberRows.filter((m) => m.electiveCount > 0).length;
    const electiveAttendances = memberRows.reduce((sum, m) => sum + m.electiveCount, 0);

    // Aggregate attainment grouped by the people's own discipline (their track).
    const byDiscipline = new Map<string, MemberTraining[]>();
    for (const m of memberRows) {
      const list = byDiscipline.get(m.discipline) ?? [];
      list.push(m);
      byDiscipline.set(m.discipline, list);
    }
    const disciplines = [...byDiscipline.entries()]
      .map(([discipline, group]) => {
        const goalHours = goalByDiscipline.get(discipline) ?? 0;
        const sum = group.reduce((s, m) => s + m.totalHours, 0);
        return {
          discipline,
          goalHours,
          avgHours: Math.round((sum / group.length) * 10) / 10,
          peopleMet: group.filter((m) => m.metGoal).length,
          totalPeople: group.length,
        };
      })
      .sort((a, b) => a.discipline.localeCompare(b.discipline));

    return TeamDevelopmentReportSchema.parse({
      year,
      scope,
      totalPeople: members.length,
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
 * Informational breakdown of a person's attended-course hours by the *subject* (discipline) of the
 * course. This is not the goal comparison (goals are measured against the person's own discipline),
 * so goalHours is 0 here — the UI renders these as plain "hours by subject".
 */
function subjectBreakdown(
  attended: { discipline: string | null; totalHours: string | number }[],
): DisciplineProgress[] {
  const byDiscipline = new Map<string, number>();
  for (const row of attended) {
    if (!row.discipline) continue;
    byDiscipline.set(
      row.discipline,
      (byDiscipline.get(row.discipline) ?? 0) + Number(row.totalHours),
    );
  }
  return [...byDiscipline.entries()]
    .map(([discipline, hours]) => ({
      discipline,
      actualHours: Math.round(hours * 10) / 10,
      goalHours: 0,
      metGoal: true,
    }))
    .sort((a, b) => b.actualHours - a.actualHours || a.discipline.localeCompare(b.discipline));
}
