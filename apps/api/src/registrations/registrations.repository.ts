import { Injectable } from '@nestjs/common';
import {
  type PriorParticipation,
  PriorParticipation as PriorParticipationSchema,
  type RegistrationResult,
  RegistrationResult as RegistrationResultSchema,
  type RegistrationSource,
} from '@toma/shared';
import type { RowDataPacket } from 'mysql2';
import { DbService } from '../db/db.service.js';
import { normalizeCourseName } from '../util/course-name.js';

interface NameRow extends RowDataPacket {
  CourseName: string;
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
  ): Promise<RegistrationResult> {
    await this.db.query('INSERT IGNORE INTO coma.coursetouser (CourseID, ID) VALUES (?, ?)', [
      courseId,
      employeeId,
    ]);
    const now = new Date().toISOString();
    return RegistrationResultSchema.parse({
      registration: {
        // Synthetic id until the registration_ext table provides a real PK (M4).
        id: courseId * 100000 + Number(employeeId),
        courseId,
        employeeId,
        status: 'registered',
        source,
        requestedBy: null,
        approvedBy: null,
        createdAt: now,
        updatedAt: now,
      },
      priorParticipations: await this.priorParticipations(courseId, employeeId),
      conflicts: await this.conflicts(courseId, employeeId),
    });
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
