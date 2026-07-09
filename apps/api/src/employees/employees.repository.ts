import { Injectable } from '@nestjs/common';
import {
  type Employee,
  Employee as EmployeeSchema,
  type PriorParticipation,
  PriorParticipation as PriorParticipationSchema,
  type Role,
  roleFromLegacyAuthorization,
} from '@toma/shared';
import type { RowDataPacket } from 'mysql2';
import { DbService } from '../db/db.service.js';
import { normalizeCourseName } from '../util/course-name.js';

interface EmployeeRow extends RowDataPacket {
  sircID: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  managerSircID: number | null;
  teamName: string | null;
  workTitle: string | null;
  rank: number | null;
  category: string | null;
  status: string;
  startDate: string | null;
  startDate2: string | null;
  endDate: string | null;
  endDate2: string | null;
  imageUrl: string | null;
  authorizationIdCOMA: number;
  roleOverride: string | null;
}

interface HistoryRow extends RowDataPacket {
  CourseID: number;
  CourseName: string;
  Year: number;
  attended: number;
}

interface CountRow extends RowDataPacket {
  c: number;
}

const EMPLOYEE_SELECT = `
  SELECT u.sircID, u.userName, u.firstName, u.lastName, u.email, u.managerSircID, u.teamName,
         u.workTitle, u.\`rank\`, u.category, u.status, u.startDate, u.startDate2, u.endDate,
         u.endDate2, u.imageUrl, u.authorizationIdCOMA, r.role AS roleOverride
  FROM emma.users u
  LEFT JOIN coma.user_role r ON r.sircID = u.sircID`;

/** Reads employees from `emma.users` (read-only) and role overrides from `coma.user_role`. */
@Injectable()
export class EmployeesRepository {
  constructor(private readonly db: DbService) {}

  /** Resolve a login to the identity DevAuth / the session needs. */
  async authLookup(
    username: string,
  ): Promise<{ userId: string; role: Role; fullName: string; email: string | null } | null> {
    const rows = await this.db.query<EmployeeRow>(`${EMPLOYEE_SELECT} WHERE u.userName = ?`, [
      username,
    ]);
    const row = rows[0];
    if (!row) return null;
    return {
      userId: String(row.sircID),
      role: resolveRole(row),
      fullName: `${row.firstName} ${row.lastName}`,
      email: row.email,
    };
  }

  async findById(id: string): Promise<Employee | null> {
    const rows = await this.db.query<EmployeeRow>(`${EMPLOYEE_SELECT} WHERE u.sircID = ?`, [id]);
    return rows[0] ? mapEmployee(rows[0]) : null;
  }

  /** Whether this person manages anyone (has at least one working direct report). */
  async hasReports(id: string): Promise<boolean> {
    const rows = await this.db.query<CountRow>(
      "SELECT COUNT(*) AS c FROM emma.users WHERE managerSircID = ? AND status = 'working'",
      [id],
    );
    return Number(rows[0]?.c ?? 0) > 0;
  }

  async list(filter: { query?: string; managerId?: string }): Promise<Employee[]> {
    const clauses = ["u.status = 'working'"];
    const params: unknown[] = [];
    if (filter.managerId) {
      clauses.push('u.managerSircID = ?');
      params.push(filter.managerId);
    }
    if (filter.query) {
      clauses.push("CONCAT(u.firstName, ' ', u.lastName) LIKE ?");
      params.push(`%${filter.query}%`);
    }
    const rows = await this.db.query<EmployeeRow>(
      `${EMPLOYEE_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY u.firstName, u.lastName`,
      params,
    );
    return rows.map(mapEmployee);
  }

  /** Multi-year training history grouped by course series (requirement #4). */
  async history(id: string): Promise<PriorParticipation[]> {
    const rows = await this.db.query<HistoryRow>(
      `SELECT c.CourseID, c.CourseName, c.Year,
              EXISTS(
                SELECT 1 FROM coma.coursedatetimetouser a
                WHERE a.CourseID = c.CourseID AND a.ID = ?
              ) AS attended
       FROM coma.coursetouser cu
       JOIN coma.courses c ON c.CourseID = cu.CourseID
       WHERE cu.ID = ?
       ORDER BY c.Year DESC, c.CourseName`,
      [id, id],
    );

    // Assign a synthetic, stable series id per distinct normalized title until the real
    // course_series table lands (plan §4.2).
    const seriesIds = new Map<string, number>();
    return rows.map((row) => {
      const title = normalizeCourseName(row.CourseName);
      if (!seriesIds.has(title)) seriesIds.set(title, seriesIds.size + 1);
      return PriorParticipationSchema.parse({
        courseId: row.CourseID,
        seriesId: seriesIds.get(title),
        year: row.Year,
        title,
        status: 'registered',
        attended: Boolean(row.attended),
      });
    });
  }
}

function resolveRole(row: EmployeeRow): Role {
  if (row.roleOverride) return row.roleOverride as Role;
  return roleFromLegacyAuthorization(row.authorizationIdCOMA);
}

function mapEmployee(row: EmployeeRow): Employee {
  const startRaw = row.startDate2 ?? row.startDate;
  const endRaw = row.startDate2 ? row.endDate2 : row.endDate;
  return EmployeeSchema.parse({
    id: String(row.sircID),
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`,
    email: row.email,
    managerId: row.managerSircID != null ? String(row.managerSircID) : null,
    department: row.teamName ? row.teamName.replace(/^\((.*)\)$/, '$1') : null,
    title: row.workTitle,
    rank: row.rank,
    category: row.category,
    status: row.status,
    startDate: startRaw ? startRaw.slice(0, 10) : null,
    endDate: endRaw ? endRaw.slice(0, 10) : null,
    avatarUrl: row.imageUrl,
  });
}
