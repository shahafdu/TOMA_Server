import { Injectable } from '@nestjs/common';
import {
  type CourseBid,
  CourseBid as CourseBidSchema,
  type CycleCourse,
  CycleCourse as CycleCourseSchema,
  type CycleStatus,
  type TrainingCycle,
  TrainingCycle as TrainingCycleSchema,
} from '@toma/shared';
import type { RowDataPacket } from 'mysql2';
import { DbService } from '../db/db.service.js';
import { normalizeCourseName } from '../util/course-name.js';

interface CycleRow extends RowDataPacket {
  CycleID: number;
  Year: number;
  Quarter: number;
  Status: string;
  BiddingClosesAt: string | null;
  RegistrationClosesAt: string | null;
  CreatedAt: string;
}
interface BoardCourseRow extends RowDataPacket {
  CourseID: number;
  CourseName: string;
  Discipline: string | null;
  LifecycleState: string;
  Capacity: number | null;
  totalBidSeats: number | string;
  registeredCount: number;
  waitlistedCount: number;
  myBidSeats: number | null;
}
interface BidRow extends RowDataPacket {
  CourseID: number;
  ManagerSircID: number;
  firstName: string;
  lastName: string;
  Seats: number;
  UpdatedAt: string;
}
interface IdRow extends RowDataPacket {
  CourseID: number;
}
interface RegIdRow extends RowDataPacket {
  ID: number;
}

@Injectable()
export class CyclesRepository {
  constructor(private readonly db: DbService) {}

  async list(): Promise<TrainingCycle[]> {
    const rows = await this.db.query<CycleRow>(
      'SELECT * FROM coma.training_cycle ORDER BY Year DESC, Quarter DESC',
    );
    return rows.map(mapCycle);
  }

  /** The most recent cycle (what the workflow UI defaults to). */
  async current(): Promise<TrainingCycle | null> {
    const rows = await this.db.query<CycleRow>(
      'SELECT * FROM coma.training_cycle ORDER BY Year DESC, Quarter DESC LIMIT 1',
    );
    return rows[0] ? mapCycle(rows[0]) : null;
  }

  async findById(id: number): Promise<TrainingCycle | null> {
    const rows = await this.db.query<CycleRow>('SELECT * FROM coma.training_cycle WHERE CycleID = ?', [
      id,
    ]);
    return rows[0] ? mapCycle(rows[0]) : null;
  }

  async create(year: number, quarter: number): Promise<TrainingCycle> {
    const res = await this.db.execute(
      'INSERT INTO coma.training_cycle (Year, Quarter, Status) VALUES (?, ?, ?)',
      [year, quarter, 'draft'],
    );
    return (await this.findById(res.insertId))!;
  }

  async setStatus(id: number, status: CycleStatus): Promise<void> {
    await this.db.execute('UPDATE coma.training_cycle SET Status = ? WHERE CycleID = ?', [status, id]);
  }

  async setBiddingDeadline(id: number, closesAt: string): Promise<void> {
    await this.db.execute('UPDATE coma.training_cycle SET BiddingClosesAt = ? WHERE CycleID = ?', [
      isoToSql(closesAt),
      id,
    ]);
  }

  async setRegistrationDeadline(id: number, closesAt: string): Promise<void> {
    await this.db.execute(
      'UPDATE coma.training_cycle SET RegistrationClosesAt = ? WHERE CycleID = ?',
      [isoToSql(closesAt), id],
    );
  }

  /** Attach candidate courses to a cycle and set their lifecycle state. */
  async attachCourses(cycleId: number, courseIds: number[], state: string): Promise<void> {
    if (courseIds.length === 0) return;
    await this.db.execute(
      'UPDATE coma.courses SET CycleID = ?, LifecycleState = ? WHERE CourseID IN (?)',
      [cycleId, state, courseIds],
    );
  }

  /** Set lifecycle state for a set of courses (optionally limited to those in a cycle). */
  async setCourseState(courseIds: number[], state: string, cycleId?: number): Promise<void> {
    if (courseIds.length === 0) return;
    const params: unknown[] = [state, courseIds];
    let sql = 'UPDATE coma.courses SET LifecycleState = ? WHERE CourseID IN (?)';
    if (cycleId != null) {
      sql += ' AND CycleID = ?';
      params.push(cycleId);
    }
    await this.db.execute(sql, params);
  }

  async courseIdsInCycle(cycleId: number, state?: string): Promise<number[]> {
    const params: unknown[] = [cycleId];
    let sql = 'SELECT CourseID FROM coma.courses WHERE CycleID = ?';
    if (state) {
      sql += ' AND LifecycleState = ?';
      params.push(state);
    }
    const rows = await this.db.query<IdRow>(sql, params);
    return rows.map((r) => r.CourseID);
  }

  /** Candidate courses of a cycle with bid/registration aggregates and the caller's own bid. */
  async boardCourses(cycleId: number, callerId: string): Promise<CycleCourse[]> {
    const rows = await this.db.query<BoardCourseRow>(
      `SELECT c.CourseID, c.CourseName, c.Discipline, c.LifecycleState, c.Capacity,
              (SELECT COALESCE(SUM(b.Seats), 0) FROM coma.course_bid b WHERE b.CourseID = c.CourseID)
                AS totalBidSeats,
              (SELECT COUNT(*) FROM coma.coursetouser cu
                 WHERE cu.CourseID = c.CourseID AND cu.status = 'registered') AS registeredCount,
              (SELECT COUNT(*) FROM coma.coursetouser cu
                 WHERE cu.CourseID = c.CourseID AND cu.status = 'waitlisted') AS waitlistedCount,
              (SELECT b2.Seats FROM coma.course_bid b2
                 WHERE b2.CourseID = c.CourseID AND b2.ManagerSircID = ?) AS myBidSeats
       FROM coma.courses c
       WHERE c.CycleID = ?
       ORDER BY c.CourseName`,
      [callerId, cycleId],
    );
    return rows.map((r) =>
      CycleCourseSchema.parse({
        courseId: r.CourseID,
        title: normalizeCourseName(r.CourseName),
        discipline: r.Discipline,
        lifecycleState: r.LifecycleState,
        capacity: r.Capacity,
        totalBidSeats: Number(r.totalBidSeats),
        registeredCount: Number(r.registeredCount),
        waitlistedCount: Number(r.waitlistedCount),
        myBidSeats: r.myBidSeats == null ? null : Number(r.myBidSeats),
      }),
    );
  }

  async setBid(courseId: number, managerId: string, seats: number): Promise<void> {
    await this.db.execute(
      `INSERT INTO coma.course_bid (CourseID, ManagerSircID, Seats) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE Seats = VALUES(Seats)`,
      [courseId, managerId, seats],
    );
  }

  /** sircIDs registered (confirmed) on a course — recipients for confirmation/upcoming mail. */
  async registeredIds(courseId: number): Promise<string[]> {
    const rows = await this.db.query<RegIdRow>(
      "SELECT ID FROM coma.coursetouser WHERE CourseID = ? AND status = 'registered'",
      [courseId],
    );
    return rows.map((r) => String(r.ID));
  }

  async bidsForCourse(courseId: number): Promise<CourseBid[]> {
    const rows = await this.db.query<BidRow>(
      `SELECT b.CourseID, b.ManagerSircID, u.firstName, u.lastName, b.Seats, b.UpdatedAt
       FROM coma.course_bid b
       JOIN emma.users u ON u.sircID = b.ManagerSircID
       WHERE b.CourseID = ?
       ORDER BY b.Seats DESC`,
      [courseId],
    );
    return rows.map((r) =>
      CourseBidSchema.parse({
        courseId: r.CourseID,
        managerId: String(r.ManagerSircID),
        managerName: `${r.firstName} ${r.lastName}`,
        seats: r.Seats,
        updatedAt: toIso(r.UpdatedAt),
      }),
    );
  }
}

function mapCycle(r: CycleRow): TrainingCycle {
  return TrainingCycleSchema.parse({
    id: r.CycleID,
    year: r.Year,
    quarter: r.Quarter,
    status: r.Status,
    biddingClosesAt: toIso(r.BiddingClosesAt),
    registrationClosesAt: toIso(r.RegistrationClosesAt),
    createdAt: toIso(r.CreatedAt),
  });
}

function toIso(value: string): string;
function toIso(value: string | null): string | null;
function toIso(value: string | null): string | null {
  if (!value) return null;
  return new Date(value.replace(' ', 'T') + 'Z').toISOString();
}

/** ISO 8601 → `YYYY-MM-DD HH:MM:SS` (UTC) for DATETIME columns. */
function isoToSql(iso: string): string {
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
}
