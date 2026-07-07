import { Injectable } from '@nestjs/common';
import { type Course, Course as CourseSchema } from '@toma/shared';
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
  Year: number;
  isTentative: number;
}

const COURSE_SELECT = `
  SELECT CourseID, CourseName, Syllabus, Notes, TextForMail, TotalHours, Price, Location,
         IsIn, IsMandatory, IsConference, CourseType, Year, isTentative
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
