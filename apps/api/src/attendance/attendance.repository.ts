import { Injectable } from '@nestjs/common';
import {
  type AttendanceJustification,
  AttendanceJustification as AttendanceJustificationSchema,
  type JustificationStatus,
} from '@toma/shared';
import type { RowDataPacket } from 'mysql2';
import { DbService } from '../db/db.service.js';
import { normalizeCourseName } from '../util/course-name.js';

interface SessionRow extends RowDataPacket {
  DateTimeStart: string;
  DateTimeEnd: string;
}
interface RegisteredRow extends RowDataPacket {
  sircID: number;
  firstName: string;
  lastName: string;
}
interface AttendedRow extends RowDataPacket {
  ID: number;
  DateTimeStart: string;
}
interface JustRow extends RowDataPacket {
  JustificationID: number;
  CourseID: number;
  CourseName: string;
  ID: number;
  firstName: string;
  lastName: string;
  SessionDate: string | null;
  Reason: string | null;
  Status: string;
  CreatedAt: string;
}

@Injectable()
export class AttendanceRepository {
  constructor(private readonly db: DbService) {}

  async sessions(courseId: number): Promise<{ startsAt: string; endsAt: string }[]> {
    const rows = await this.db.query<SessionRow>(
      'SELECT DateTimeStart, DateTimeEnd FROM coma.coursetodatetime WHERE CourseID = ? ORDER BY DateTimeStart',
      [courseId],
    );
    return rows.map((r) => ({ startsAt: toIso(r.DateTimeStart), endsAt: toIso(r.DateTimeEnd) }));
  }

  /** Registered (confirmed) attendees of a course. */
  async registered(courseId: number): Promise<{ id: string; name: string }[]> {
    const rows = await this.db.query<RegisteredRow>(
      `SELECT u.sircID, u.firstName, u.lastName
       FROM coma.coursetouser cu
       JOIN emma.users u ON u.sircID = cu.ID
       WHERE cu.CourseID = ? AND cu.status = 'registered'
       ORDER BY u.firstName, u.lastName`,
      [courseId],
    );
    return rows.map((r) => ({ id: String(r.sircID), name: `${r.firstName} ${r.lastName}` }));
  }

  /** Set of `${employeeId}|${sessionStartSql}` for whom attendance is recorded. */
  async attendedKeys(courseId: number): Promise<Set<string>> {
    const rows = await this.db.query<AttendedRow>(
      'SELECT ID, DateTimeStart FROM coma.coursedatetimetouser WHERE CourseID = ?',
      [courseId],
    );
    return new Set(rows.map((r) => `${r.ID}|${r.DateTimeStart}`));
  }

  async markPresent(courseId: number, employeeId: string, startSql: string, endSql: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO coma.coursedatetimetouser (CourseID, ID, DateTimeStart, DateTimeEnd)
       SELECT ?, ?, ?, ? FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM coma.coursedatetimetouser
         WHERE CourseID = ? AND ID = ? AND DateTimeStart = ?
       )`,
      [courseId, employeeId, startSql, endSql, courseId, employeeId, startSql],
    );
  }

  async markAbsent(courseId: number, employeeId: string, startSql: string): Promise<void> {
    await this.db.execute(
      'DELETE FROM coma.coursedatetimetouser WHERE CourseID = ? AND ID = ? AND DateTimeStart = ?',
      [courseId, employeeId, startSql],
    );
  }

  /** Open (or reuse) a no-show justification request for a missed day. */
  async requestJustification(courseId: number, employeeId: string, sessionDate: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO coma.attendance_justification (CourseID, ID, SessionDate, Status)
       VALUES (?, ?, ?, 'requested')
       ON DUPLICATE KEY UPDATE Status = IF(Status IN ('accepted','rejected'), Status, 'requested')`,
      [courseId, employeeId, sessionDate],
    );
  }

  async findJustification(id: number): Promise<AttendanceJustification | null> {
    const rows = await this.db.query<JustRow>(`${JUST_SELECT} WHERE j.JustificationID = ?`, [id]);
    return rows[0] ? mapJust(rows[0]) : null;
  }

  async listJustifications(employeeIds: number[] | null): Promise<AttendanceJustification[]> {
    if (employeeIds && employeeIds.length === 0) return [];
    const where = employeeIds ? 'WHERE j.ID IN (?)' : '';
    const params = employeeIds ? [employeeIds] : [];
    const rows = await this.db.query<JustRow>(
      `${JUST_SELECT} ${where} ORDER BY j.CreatedAt DESC`,
      params,
    );
    return rows.map(mapJust);
  }

  async submitJustification(id: number, reason: string): Promise<void> {
    await this.db.execute(
      "UPDATE coma.attendance_justification SET Reason = ?, Status = 'submitted' WHERE JustificationID = ?",
      [reason, id],
    );
  }

  async reviewJustification(id: number, status: JustificationStatus): Promise<void> {
    await this.db.execute(
      'UPDATE coma.attendance_justification SET Status = ? WHERE JustificationID = ?',
      [status, id],
    );
  }
}

const JUST_SELECT = `
  SELECT j.JustificationID, j.CourseID, c.CourseName, j.ID, u.firstName, u.lastName,
         j.SessionDate, j.Reason, j.Status, j.CreatedAt
  FROM coma.attendance_justification j
  JOIN coma.courses c ON c.CourseID = j.CourseID
  JOIN emma.users u ON u.sircID = j.ID`;

function mapJust(r: JustRow): AttendanceJustification {
  return AttendanceJustificationSchema.parse({
    id: r.JustificationID,
    courseId: r.CourseID,
    courseTitle: normalizeCourseName(r.CourseName),
    employeeId: String(r.ID),
    employeeName: `${r.firstName} ${r.lastName}`,
    sessionDate: r.SessionDate ? r.SessionDate.slice(0, 10) : null,
    reason: r.Reason,
    status: r.Status,
    createdAt: toIso(r.CreatedAt),
  });
}

function toIso(value: string): string {
  return new Date(value.replace(' ', 'T') + 'Z').toISOString();
}
