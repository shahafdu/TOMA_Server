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
  TotalHours: string;
  Location: string | null;
  IsIn: number;
  IsMandatory: number;
  IsConference: number;
  CourseType: number;
  Discipline: string | null;
  DeliveryType: string;
  Platform: string | null;
  PlatformUrl: string | null;
  Capacity: number | null;
  PerManagerLimit: number | null;
  SelfRegistration: string;
  ExcludeSubcontractors: number;
  ExcludeStudents: number;
  CycleID: number | null;
  LifecycleState: string;
  Year: number;
  isTentative: number;
}

interface SessionSummaryRow extends RowDataPacket {
  CourseID: number;
  DateTimeStart: string;
  DateTimeEnd: string;
}

interface TeamRestrictionRow extends RowDataPacket {
  CourseID: number;
  teamName: string;
}

const COURSE_SELECT = `
  SELECT CourseID, CourseName, Syllabus, Notes, TextForMail, TotalHours, Price, Location,
         IsIn, IsMandatory, IsConference, CourseType, Discipline, DeliveryType, Platform,
         PlatformUrl, Capacity, PerManagerLimit, SelfRegistration, ExcludeSubcontractors,
         ExcludeStudents, CycleID, LifecycleState, Year, isTentative
  FROM coma.courses`;

@Injectable()
export class CoursesRepository {
  constructor(private readonly db: DbService) {}

  async list(year: number): Promise<Course[]> {
    const rows = await this.db.query<CourseRow>(
      `${COURSE_SELECT} WHERE Year = ? ORDER BY CourseName`,
      [year],
    );
    const ids = rows.map((r) => r.CourseID);
    const [sessions, teams] = await Promise.all([
      this.sessionSummaries(ids),
      this.teamRestrictions(ids),
    ]);
    return rows.map((r) =>
      mapCourse(r, sessions.get(r.CourseID) ?? [], teams.get(r.CourseID) ?? []),
    );
  }

  async findById(id: number): Promise<Course | null> {
    const rows = await this.db.query<CourseRow>(`${COURSE_SELECT} WHERE CourseID = ?`, [id]);
    if (!rows[0]) return null;
    const [sessions, teams] = await Promise.all([
      this.sessionSummaries([id]),
      this.teamRestrictions([id]),
    ]);
    return mapCourse(rows[0], sessions.get(id) ?? [], teams.get(id) ?? []);
  }

  /** Team/group restrictions per course (requirement #8); no rows ⇒ open to all teams. */
  private async teamRestrictions(courseIds: number[]): Promise<Map<number, string[]>> {
    const map = new Map<number, string[]>();
    if (courseIds.length === 0) return map;
    const rows = await this.db.query<TeamRestrictionRow>(
      `SELECT CourseID, teamName FROM coma.course_team_restriction WHERE CourseID IN (?)`,
      [courseIds],
    );
    for (const r of rows) {
      const arr = map.get(r.CourseID) ?? [];
      arr.push(r.teamName);
      map.set(r.CourseID, arr);
    }
    return map;
  }

  /** One grouped query for the lightweight session dates shown on cards/calendar. */
  private async sessionSummaries(
    courseIds: number[],
  ): Promise<Map<number, { startsAt: string; endsAt: string }[]>> {
    const map = new Map<number, { startsAt: string; endsAt: string }[]>();
    if (courseIds.length === 0) return map;
    const rows = await this.db.query<SessionSummaryRow>(
      `SELECT CourseID, DateTimeStart, DateTimeEnd
       FROM coma.coursetodatetime
       WHERE CourseID IN (?)
       ORDER BY DateTimeStart`,
      [courseIds],
    );
    for (const r of rows) {
      const arr = map.get(r.CourseID) ?? [];
      arr.push({ startsAt: toIso(r.DateTimeStart), endsAt: toIso(r.DateTimeEnd) });
      map.set(r.CourseID, arr);
    }
    return map;
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
              u.managerSircID, u.category, u.status
       FROM coma.coursetouser cu
       JOIN emma.users u ON u.sircID = cu.ID
       WHERE cu.CourseID = ? AND cu.status IN ('registered', 'pending_approval')
       ORDER BY u.firstName, u.lastName`,
      [courseId],
    );
    return rows.map((r) => toSummary(r));
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
  category: string | null;
  status: string;
}

/** Map an emma.users row to the compact EmployeeSummary (team name de-parenthesized). */
export function toSummary(r: ParticipantRow): EmployeeSummary {
  return EmployeeSummarySchema.parse({
    id: String(r.sircID),
    fullName: `${r.firstName} ${r.lastName}`,
    email: r.email,
    department: r.teamName ? r.teamName.replace(/^\((.*)\)$/, '$1') : null,
    title: r.workTitle,
    managerId: r.managerSircID != null ? String(r.managerSircID) : null,
    category: r.category,
    status: r.status,
  });
}

function toIso(dateString: string): string {
  return new Date(dateString.replace(' ', 'T') + 'Z').toISOString();
}

function mapCourse(
  row: CourseRow,
  sessions: { startsAt: string; endsAt: string }[],
  restrictedTeams: string[],
): Course {
  const deliveryType = row.DeliveryType === 'online' ? 'online' : 'in_person';
  const platform = row.Platform === 'corporate' ? 'corporate' : row.Platform ? 'other' : null;
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
    deliveryType,
    platform: deliveryType === 'online' ? platform : null,
    platformUrl: deliveryType === 'online' ? row.PlatformUrl : null,
    location: deliveryType === 'online' ? null : row.Location,
    isMandatory: Boolean(row.IsMandatory),
    isInternal: Boolean(row.IsIn),
    totalHours: Number(row.TotalHours),
    sessions,
    price: Number(row.Price),
    // Online courses are always unlimited; ignore any stray capacity value.
    capacity: deliveryType === 'online' ? null : row.Capacity,
    perManagerLimit: row.PerManagerLimit,
    excludeSubcontractors: Boolean(row.ExcludeSubcontractors),
    excludeStudents: Boolean(row.ExcludeStudents),
    restrictedTeams,
    selfRegistration: parseSelfReg(row.SelfRegistration),
    ownerId: null,
    cycleId: row.CycleID,
    lifecycleState: LIFECYCLE_STATES.has(row.LifecycleState) ? row.LifecycleState : 'catalog',
  });
}

const LIFECYCLE_STATES = new Set([
  'catalog',
  'candidate',
  'bidding',
  'open',
  'locked',
  'confirmed',
  'rejected',
]);

function parseSelfReg(value: string): 'none' | 'open' | 'approval_required' {
  return value === 'open' || value === 'approval_required' ? value : 'none';
}
