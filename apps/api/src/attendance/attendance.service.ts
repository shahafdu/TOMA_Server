import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AttendanceGrid,
  AttendanceGrid as AttendanceGridSchema,
  type AttendanceJustification,
  type MarkAttendanceInput,
} from '@toma/shared';
import { CoursesRepository } from '../courses/courses.repository.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AttendanceRepository } from './attendance.repository.js';

const HR_ROLES = ['hr', 'admin', 'developer'];

export interface Caller {
  userId: string;
  role: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly courses: CoursesRepository,
    private readonly employees: EmployeesRepository,
    private readonly notifications: NotificationsService,
  ) {}

  /** The per-day attendance grid HR fills in (requirement #9). */
  async grid(courseId: number): Promise<AttendanceGrid> {
    const course = await this.assertCourse(courseId);
    const [sessions, registered, attended] = await Promise.all([
      this.repo.sessions(courseId),
      this.repo.registered(courseId),
      this.repo.attendedKeys(courseId),
    ]);
    const rows = registered.map((emp) => ({
      employeeId: emp.id,
      employeeName: emp.name,
      present: sessions.map((s) => attended.has(`${emp.id}|${isoToSql(s.startsAt)}`)),
    }));
    return AttendanceGridSchema.parse({ courseId, courseTitle: course.title, sessions, rows });
  }

  /** HR marks one person present/absent for one day; an absence opens a justification (#9). */
  async mark(courseId: number, input: MarkAttendanceInput): Promise<void> {
    const course = await this.assertCourse(courseId);
    const sessions = await this.repo.sessions(courseId);
    const session = sessions.find((s) => s.startsAt === input.sessionStart);
    if (!session) throw new NotFoundException({ error: 'No such session' });

    const startSql = isoToSql(session.startsAt);
    if (input.present) {
      await this.repo.markPresent(courseId, input.employeeId, startSql, isoToSql(session.endsAt));
      return;
    }

    await this.repo.markAbsent(courseId, input.employeeId, startSql);
    const sessionDate = startSql.slice(0, 10);
    await this.repo.requestJustification(courseId, input.employeeId, sessionDate);

    // Notify the employee and their manager to provide a justification (#9).
    const manager = await this.employees.managerOf(input.employeeId);
    const recipients = [input.employeeId, ...(manager ? [manager] : [])];
    await this.notifications.queueMany(recipients, {
      event: 'justification_requested',
      subject: `Missing attendance: ${course.title}`,
      body: `An absence was recorded for "${course.title}" on ${sessionDate}. Please provide a justification in TOMA for HR to review.`,
      courseId,
    });
  }

  /** Justifications visible to the caller: HR sees all; managers see their team; employees, own. */
  async justifications(caller: Caller): Promise<AttendanceJustification[]> {
    if (HR_ROLES.includes(caller.role)) return this.repo.listJustifications(null);
    const subtree = await this.employees.subtreeSummaries(caller.userId);
    const ids = [Number(caller.userId), ...subtree.map((s) => Number(s.id))];
    return this.repo.listJustifications(ids);
  }

  async submit(id: number, reason: string, caller: Caller): Promise<AttendanceJustification> {
    const just = await this.assertJustification(id);
    const allowed =
      HR_ROLES.includes(caller.role) ||
      just.employeeId === caller.userId ||
      (await this.managesEmployee(caller, just.employeeId));
    if (!allowed) throw new ForbiddenException({ error: 'Not permitted for this justification' });
    await this.repo.submitJustification(id, reason);
    return (await this.repo.findJustification(id))!;
  }

  async review(
    id: number,
    decision: 'accept' | 'reject',
    caller: Caller,
  ): Promise<AttendanceJustification> {
    if (!HR_ROLES.includes(caller.role)) {
      throw new ForbiddenException({ error: 'Only HR can review justifications' });
    }
    const just = await this.assertJustification(id);
    await this.repo.reviewJustification(id, decision === 'accept' ? 'accepted' : 'rejected');
    await this.notifications.queue({
      event: 'justification_reviewed',
      recipientId: just.employeeId,
      subject: `Justification ${decision === 'accept' ? 'accepted' : 'rejected'}: ${just.courseTitle}`,
      body: `HR has ${decision === 'accept' ? 'accepted' : 'rejected'} your absence justification for "${just.courseTitle}".`,
      courseId: just.courseId,
    });
    return (await this.repo.findJustification(id))!;
  }

  private async managesEmployee(caller: Caller, employeeId: string): Promise<boolean> {
    if (caller.role !== 'manager') return false;
    const subtree = await this.employees.subtreeSummaries(caller.userId);
    return subtree.some((s) => s.id === employeeId);
  }

  private async assertCourse(courseId: number) {
    const course = await this.courses.findById(courseId);
    if (!course) throw new NotFoundException({ error: 'No such course' });
    return course;
  }

  private async assertJustification(id: number): Promise<AttendanceJustification> {
    const just = await this.repo.findJustification(id);
    if (!just) throw new NotFoundException({ error: 'No such justification' });
    return just;
  }
}

/** ISO 8601 → `YYYY-MM-DD HH:MM:SS` (UTC) to match DATETIME column values. */
function isoToSql(iso: string): string {
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
}
