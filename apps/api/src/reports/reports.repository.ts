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

  async directReportIds(managerId: string): Promise<number[]> {
    const rows = await this.db.query<IdRow>(
      "SELECT sircID FROM emma.users WHERE managerSircID = ? AND status = 'working'",
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
}
