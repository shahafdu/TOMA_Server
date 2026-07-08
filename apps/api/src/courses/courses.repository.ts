import { Injectable } from '@nestjs/common';
import {
  type Course,
  Course as CourseSchema,
  type CourseSession,
  CourseSession as CourseSessionSchema,
  type EmployeeSummary,
  EmployeeSummary as EmployeeSummarySchema,
} from '@toma/shared';
import type { RowDataPacket } from 'mysql2';
import { DbService } from '../db/db.service.js';
import { normalizeCourseName } from '../util/course-name.js';

interface CourseRow extends RowDataPacket {
  CourseID: number;
  CourseName: string;
  Syllabus: string | null;
  Notes: string | null;
  TextForMail: string | null;
  Price: string; // DECIMAL returned as string by mysql2
  Location: string | null;
  IsIn: number;
  IsMandatory: number;
  IsConference: number;
  CourseType: number;
  Discipline: string | null;
  Year: number;
  isTentative: number;
}

const COURSE_SELECT = `
  SELECT CourseID, CourseName, Syllabus, Notes, TextForMail, TotalHours, Price, Location,
         IsIn, IsMandatory, IsConference, CourseType, Discipline, Year, isTentative
  FROM coma.courses`;

@Injectable()
export class CoursesRepository {
  constructor(private readonly db: DbService) {}

  async list(year: number): Promise<Course[]> {
    const rows = await this.db.query<CourseRow>(
      `${COURSE_SELECT} WHERE Year = ? ORDER BY CourseName`,
      [year],
    );
    return rows.map(mapCourse);
  }

  async findById(id: number): Promise<Course | null> {
    const rows = await this.db.query<CourseRow>(`${COURSE_SELECT} WHERE CourseID = ?`, [id]);
    return rows[0] ? mapCourse(rows[0]) : null;
  }

  async sessions(courseId: number): Promise<CourseSession[]> {
    const rows = await this.db.query<SessionRow>(
      `SELECT s.DateTimeStart, s.DateTimeEnd, c.Location, c.Lecturer
       FROM coma.coursetodatetime s
       JOIN coma.courses c ON c.CourseID = s.CourseID
       WHERE s.CourseID = ?
       ORDER BY s.DateTimeStart`,
      [courseId],
    );
    return rows.map((r, index) =>
      CourseSessionSchema.parse({
        id: courseId * 1000 + index + 1,
        courseId,
        startsAt: toIso(r.DateTimeStart),
        endsAt: toIso(r.DateTimeEnd),
        venue: r.Location,
        lecturer: r.Lecturer,
      }),
    );
  }

  async participants(courseId: number): Promise<EmployeeSummary[]> {
    const rows = await this.db.query<ParticipantRow>(
      `SELECT u.sircID, u.firstName, u.lastName, u.email, u.teamName, u.workTitle,
              u.managerSircID, u.status
       FROM coma.coursetouser cu
       JOIN emma.users u ON u.sircID = cu.ID
       WHERE cu.CourseID = ?
       ORDER BY u.firstName, u.lastName`,
      [courseId],
    );
    return rows.map((r) =>
      EmployeeSummarySchema.parse({
        id: String(r.sircID),
        fullName: `${r.firstName} ${r.lastName}`,
        email: r.email,
        department: r.teamName ? r.teamName.replace(/^\((.*)\)$/, '$1') : null,
        title: r.workTitle,
        managerId: r.managerSircID != null ? String(r.managerSircID) : null,
        status: r.status,
      }),
    );
  }
}

interface SessionRow extends RowDataPacket {
  DateTimeStart: string;
  DateTimeEnd: string;
  Location: string | null;
  Lecturer: string | null;
}

interface ParticipantRow extends RowDataPacket {
  sircID: number;
  firstName: string;
  lastName: string;
  email: string | null;
  teamName: string | null;
  workTitle: string | null;
  managerSircID: number | null;
  status: string;
}

function toIso(dateString: string): string {
  return new Date(dateString.replace(' ', 'T') + 'Z').toISOString();
}

function mapCourse(row: CourseRow): Course {
  return CourseSchema.parse({
    id: row.CourseID,
    seriesId: null,
    title: normalizeCourseName(row.CourseName),
    year: row.Year,
    descriptionHtml: row.Syllabus,
    notes: row.Notes,
    mailText: row.TextForMail,
    type: row.IsConference ? 'conference' : row.CourseType === 0 ? 'technical' : 'enrichment',
    discipline: row.Discipline,
    status: row.isTentative ? 'tentative' : 'scheduled',
    deliveryType: 'in_person',
    platform: null,
    platformUrl: null,
    isMandatory: Boolean(row.IsMandatory),
    isInternal: Boolean(row.IsIn),
    price: Number(row.Price),
    capacity: null,
    selfRegistration: 'none',
    ownerId: null,
  });
}
