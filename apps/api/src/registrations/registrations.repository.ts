import { Injectable } from '@nestjs/common';
import {
  type PriorParticipation,
  PriorParticipation as PriorParticipationSchema,
  type RegistrationResult,
  RegistrationResult as RegistrationResultSchema,
  type RegistrationSource,
  type RegistrationStatus,
} from '@toma/shared';
import type { RowDataPacket } from 'mysql2';
import { DbService } from '../db/db.service.js';
import { normalizeCourseName } from '../util/course-name.js';

interface NameRow extends RowDataPacket {
  CourseName: string;
}
interface RegStatusRow extends RowDataPacket {
  ID: number;
  status: string;
}
interface StatusCountRow extends RowDataPacket {
  status: string;
  c: number;
}
interface PriorRow extends RowDataPacket {
  CourseID: number;
  CourseName: string;
  Year: number;
  attended: number;
}
interface ConflictRow extends RowDataPacket {
  CourseID: number;
  CourseName: string;
  DateTimeStart: string;
  DateTimeEnd: string;
}

/** Registration writes against the legacy `coursetouser` table, enriched with the context the
 * UI needs (requirement #4). Status/source/waitlist land with the `registration_ext` table (M4). */
@Injectable()
export class RegistrationsRepository {
  constructor(private readonly db: DbService) {}

  async register(
    courseId: number,
    employeeId: string,
    source: RegistrationSource,
    status: RegistrationStatus,
    requestedBy: string | null,
  ): Promise<RegistrationResult> {
    // Upsert so a re-request after a decline/cancel re-opens the row with the new status.
    await this.db.query(
      `INSERT INTO coma.coursetouser (CourseID, ID, status, source, requestedBy)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), source = VALUES(source),
                               requestedBy = VALUES(requestedBy)`,
      [courseId, employeeId, status, source, requestedBy],
    );
    const now = new Date().toISOString();
    return RegistrationResultSchema.parse({
      registration: {
        // Synthetic id until the registration_ext table provides a real PK (M4).
        id: courseId * 100000 + Number(employeeId),
        courseId,
        employeeId,
        status,
        source,
        requestedBy,
        approvedBy: null,
        createdAt: now,
        updatedAt: now,
      },
      priorParticipations: await this.priorParticipations(courseId, employeeId),
      conflicts: await this.conflicts(courseId, employeeId),
    });
  }

  /** Current registration status per employee for a course (excludes cleared rows). */
  async registrationsFor(courseId: number): Promise<Map<string, RegistrationStatus>> {
    const rows = await this.db.query<RegStatusRow>(
      'SELECT ID, status FROM coma.coursetouser WHERE CourseID = ?',
      [courseId],
    );
    const map = new Map<string, RegistrationStatus>();
    for (const r of rows) map.set(String(r.ID), r.status as RegistrationStatus);
    return map;
  }

  /** Registered / pending / waitlisted head-counts for a course (drives seat availability). */
  async statusCounts(
    courseId: number,
  ): Promise<{ registered: number; pending: number; waitlisted: number }> {
    const rows = await this.db.query<StatusCountRow>(
      `SELECT status, COUNT(*) AS c FROM coma.coursetouser WHERE CourseID = ? GROUP BY status`,
      [courseId],
    );
    let registered = 0;
    let pending = 0;
    let waitlisted = 0;
    for (const r of rows) {
      if (r.status === 'registered') registered = Number(r.c);
      else if (r.status === 'pending_approval') pending = Number(r.c);
      else if (r.status === 'waitlisted') waitlisted = Number(r.c);
    }
    return { registered, pending, waitlisted };
  }

  /** The earliest-registered waitlisted person on a course (for promotion when a seat frees). */
  async earliestWaitlisted(courseId: number): Promise<string | null> {
    const rows = await this.db.query<RegStatusRow>(
      `SELECT ID, status FROM coma.coursetouser
       WHERE CourseID = ? AND status = 'waitlisted'
       ORDER BY createdAt ASC, ID ASC LIMIT 1`,
      [courseId],
    );
    return rows[0] ? String(rows[0].ID) : null;
  }

  async statusOf(courseId: number, employeeId: string): Promise<RegistrationStatus | null> {
    const rows = await this.db.query<RegStatusRow>(
      'SELECT ID, status FROM coma.coursetouser WHERE CourseID = ? AND ID = ?',
      [courseId, employeeId],
    );
    return rows[0] ? (rows[0].status as RegistrationStatus) : null;
  }

  async updateStatus(
    courseId: number,
    employeeId: string,
    status: RegistrationStatus,
    approvedBy: string | null,
  ): Promise<void> {
    await this.db.query(
      'UPDATE coma.coursetouser SET status = ?, approvedBy = ? WHERE CourseID = ? AND ID = ?',
      [status, approvedBy, courseId, employeeId],
    );
  }

  async precheck(courseId: number, employeeId: string): Promise<RegistrationResult> {
    return RegistrationResultSchema.parse({
      registration: null,
      priorParticipations: await this.priorParticipations(courseId, employeeId),
      conflicts: await this.conflicts(courseId, employeeId),
    });
  }

  /** Prior runs of the *same series* (same normalized title) the employee already took. */
  private async priorParticipations(
    courseId: number,
    employeeId: string,
  ): Promise<PriorParticipation[]> {
    const nameRows = await this.db.query<NameRow>(
      'SELECT CourseName FROM coma.courses WHERE CourseID = ?',
      [courseId],
    );
    const target = nameRows[0] ? normalizeCourseName(nameRows[0].CourseName) : null;
    if (!target) return [];

    const rows = await this.db.query<PriorRow>(
      `SELECT c.CourseID, c.CourseName, c.Year,
              EXISTS(
                SELECT 1 FROM coma.coursedatetimetouser a
                WHERE a.CourseID = c.CourseID AND a.ID = ?
              ) AS attended
       FROM coma.coursetouser cu
       JOIN coma.courses c ON c.CourseID = cu.CourseID
       WHERE cu.ID = ? AND c.CourseID <> ?
       ORDER BY c.Year DESC`,
      [employeeId, employeeId, courseId],
    );

    return rows
      .filter((r) => normalizeCourseName(r.CourseName) === target)
      .map((r) =>
        PriorParticipationSchema.parse({
          courseId: r.CourseID,
          seriesId: 1,
          year: r.Year,
          title: target,
          status: 'registered',
          attended: Boolean(r.attended),
        }),
      );
  }

  /** Other courses the employee is on whose sessions overlap this course's, same calendar day. */
  private async conflicts(courseId: number, employeeId: string) {
    const rows = await this.db.query<ConflictRow>(
      `SELECT DISTINCT c2.CourseID, c2.CourseName, s2.DateTimeStart, s2.DateTimeEnd
       FROM coma.coursetodatetime s1
       JOIN coma.coursetouser cu2 ON cu2.ID = ?
       JOIN coma.courses c2 ON c2.CourseID = cu2.CourseID AND c2.CourseID <> ?
       JOIN coma.coursetodatetime s2 ON s2.CourseID = c2.CourseID
       WHERE s1.CourseID = ?
         AND DATE(s1.DateTimeStart) = DATE(s2.DateTimeStart)
         AND s1.DateTimeStart < s2.DateTimeEnd
         AND s2.DateTimeStart < s1.DateTimeEnd`,
      [employeeId, courseId, courseId],
    );
    return rows.map((r) => ({
      courseId: r.CourseID,
      title: normalizeCourseName(r.CourseName),
      startsAt: toIso(r.DateTimeStart),
      endsAt: toIso(r.DateTimeEnd),
    }));
  }
}

function toIso(dateString: string): string {
  return new Date(dateString.replace(' ', 'T') + 'Z').toISOString();
}
