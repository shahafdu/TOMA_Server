import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import { DbService } from '../db/db.service.js';

/** Year columns that physically exist in the legacy per-year tables (plan §4.9). */
const KNOWN_YEARS = new Set([2024, 2025, 2026]);

interface IdRow extends RowDataPacket {
  sircID: number;
}
interface MandatoryRow extends RowDataPacket {
  CourseID: number;
  CourseName: string;
  Discipline: string | null;
}
interface CountRow extends RowDataPacket {
  c: number;
}
interface ScalarRow extends RowDataPacket {
  v: number | string | null;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly db: DbService) {}

  async allWorkingIds(): Promise<number[]> {
    const rows = await this.db.query<IdRow>(
      "SELECT sircID FROM emma.users WHERE status = 'working'",
    );
    return rows.map((r) => r.sircID);
  }

  /** Every working employee anywhere below `managerId` in the org tree (full subtree, recursive). */
  async subtreeIds(managerId: string): Promise<number[]> {
    const rows = await this.db.query<IdRow>(
      `WITH RECURSIVE sub AS (
         SELECT sircID FROM emma.users WHERE managerSircID = ? AND status = 'working'
         UNION
         SELECT u.sircID FROM emma.users u
           INNER JOIN sub s ON u.managerSircID = s.sircID
         WHERE u.status = 'working'
       )
       SELECT sircID FROM sub`,
      [managerId],
    );
    return rows.map((r) => r.sircID);
  }

  async mandatoryCourses(year: number): Promise<MandatoryRow[]> {
    return this.db.query<MandatoryRow>(
      `SELECT CourseID, CourseName, Discipline
       FROM coma.courses
       WHERE Year = ? AND IsMandatory = 1
       ORDER BY CourseName`,
      [year],
    );
  }

  async completedCount(courseId: number, eligibleIds: number[]): Promise<number> {
    if (eligibleIds.length === 0) return 0;
    const rows = await this.db.query<CountRow>(
      `SELECT COUNT(DISTINCT ID) AS c
       FROM coma.coursedatetimetouser
       WHERE CourseID = ? AND ID IN (?)`,
      [courseId, eligibleIds],
    );
    return Number(rows[0]?.c ?? 0);
  }

  async hasAttended(courseId: number, employeeId: string): Promise<boolean> {
    const rows = await this.db.query<CountRow>(
      'SELECT COUNT(*) AS c FROM coma.coursedatetimetouser WHERE CourseID = ? AND ID = ?',
      [courseId, employeeId],
    );
    return Number(rows[0]?.c ?? 0) > 0;
  }

  async registeredCount(employeeId: string, year: number): Promise<number> {
    const rows = await this.db.query<CountRow>(
      `SELECT COUNT(*) AS c
       FROM coma.coursetouser cu
       JOIN coma.courses c ON c.CourseID = cu.CourseID
       WHERE cu.ID = ? AND c.Year = ?`,
      [employeeId, year],
    );
    return Number(rows[0]?.c ?? 0);
  }

  async educationHours(employeeId: string, year: number): Promise<number> {
    if (!KNOWN_YEARS.has(year)) return 0;
    const rows = await this.db.query<ScalarRow>(
      `SELECT EducationHours${year} AS v FROM coma.users WHERE ID = ?`,
      [employeeId],
    );
    return Number(rows[0]?.v ?? 0);
  }

  async targetHours(year: number): Promise<number> {
    if (!KNOWN_YEARS.has(year)) return 0;
    const rows = await this.db.query<ScalarRow>(
      `SELECT yearlyTargetHours${year} AS v FROM coma.hours LIMIT 1`,
    );
    return Number(rows[0]?.v ?? 0);
  }

  async yearlyBudget(year: number): Promise<number> {
    if (!KNOWN_YEARS.has(year)) return 0;
    const rows = await this.db.query<ScalarRow>(
      `SELECT yearlyBudget${year} AS v FROM coma.budget LIMIT 1`,
    );
    return Number(rows[0]?.v ?? 0);
  }

  /** Committed spend = sum of prices of the year's scheduled (non-tentative) courses. */
  async committedSpend(year: number): Promise<number> {
    const rows = await this.db.query<ScalarRow>(
      'SELECT SUM(Price) AS v FROM coma.courses WHERE Year = ? AND isTentative = 0',
      [year],
    );
    return Number(rows[0]?.v ?? 0);
  }

  async spendByDiscipline(year: number): Promise<{ discipline: string; amount: number }[]> {
    const rows = await this.db.query<DisciplineSpendRow>(
      `SELECT Discipline AS discipline, SUM(Price) AS amount
       FROM coma.courses
       WHERE Year = ? AND isTentative = 0 AND Discipline IS NOT NULL
       GROUP BY Discipline
       ORDER BY amount DESC`,
      [year],
    );
    return rows.map((r) => ({ discipline: r.discipline, amount: Number(r.amount) }));
  }

  /**
   * One row per (person, distinct attended course) in the given year, carrying the course's
   * discipline, mandatory flag and total hours. Callers aggregate this into per-discipline hours,
   * elective counts and per-member rollups. Uses DISTINCT (CourseID, ID) so a multi-day course is
   * counted once per person.
   */
  async attendedCourseHours(eligibleIds: number[], year: number): Promise<AttendedHoursRow[]> {
    if (eligibleIds.length === 0) return [];
    return this.db.query<AttendedHoursRow>(
      `SELECT a.ID AS sircID, c.Discipline AS discipline, c.IsMandatory AS isMandatory,
              a.CourseID AS courseId, c.TotalHours AS totalHours
       FROM (SELECT DISTINCT CourseID, ID FROM coma.coursedatetimetouser) a
       JOIN coma.courses c ON c.CourseID = a.CourseID
       WHERE c.Year = ? AND a.ID IN (?)`,
      [year, eligibleIds],
    );
  }

  /** Every in-scope registration this year with whether the person actually attended (#10). */
  async attendance(eligibleIds: number[], year: number): Promise<AttendanceDataRow[]> {
    if (eligibleIds.length === 0) return [];
    return this.db.query<AttendanceDataRow>(
      `SELECT u.sircID, u.firstName, u.lastName, u.teamName,
              c.CourseID, c.CourseName, c.Discipline, cu.status,
              EXISTS(
                SELECT 1 FROM coma.coursedatetimetouser a
                WHERE a.CourseID = c.CourseID AND a.ID = u.sircID
              ) AS attended
       FROM coma.coursetouser cu
       JOIN coma.courses c ON c.CourseID = cu.CourseID
       JOIN emma.users u ON u.sircID = cu.ID
       WHERE c.Year = ? AND cu.ID IN (?) AND cu.status IN ('registered', 'pending_approval')
       ORDER BY u.firstName, u.lastName, c.CourseName`,
      [year, eligibleIds],
    );
  }
}

interface DisciplineSpendRow extends RowDataPacket {
  discipline: string;
  amount: string | number;
}

interface AttendanceDataRow extends RowDataPacket {
  sircID: number;
  firstName: string;
  lastName: string;
  teamName: string | null;
  CourseID: number;
  CourseName: string;
  Discipline: string | null;
  status: string;
  attended: number;
}

interface AttendedHoursRow extends RowDataPacket {
  sircID: number;
  discipline: string | null;
  isMandatory: number;
  courseId: number;
  totalHours: string | number;
}
