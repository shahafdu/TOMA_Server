import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import { DbService } from '../db/db.service.js';

interface GoalRow extends RowDataPacket {
  Discipline: string;
  TargetHours: string | number;
}

/** Per-discipline yearly training-hour goals (`coma.training_goal`). */
@Injectable()
export class GoalsRepository {
  constructor(private readonly db: DbService) {}

  async forYear(year: number): Promise<{ discipline: string; targetHours: number }[]> {
    const rows = await this.db.query<GoalRow>(
      'SELECT Discipline, TargetHours FROM coma.training_goal WHERE Year = ? ORDER BY Discipline',
      [year],
    );
    return rows.map((r) => ({ discipline: r.Discipline, targetHours: Number(r.TargetHours) }));
  }

  /** Replace the whole set of goals for a year (delete-then-insert). */
  async replaceForYear(
    year: number,
    goals: { discipline: string; targetHours: number }[],
  ): Promise<void> {
    await this.db.execute('DELETE FROM coma.training_goal WHERE Year = ?', [year]);
    if (goals.length === 0) return;
    // De-duplicate by discipline (last write wins) so the PRIMARY KEY can't collide.
    const byDiscipline = new Map<string, number>();
    for (const g of goals) byDiscipline.set(g.discipline.trim(), g.targetHours);
    const values = [...byDiscipline.entries()]
      .filter(([discipline]) => discipline.length > 0)
      .map(([discipline, targetHours]) => [year, discipline, targetHours]);
    if (values.length === 0) return;
    await this.db.execute(
      'INSERT INTO coma.training_goal (Year, Discipline, TargetHours) VALUES ?',
      [values],
    );
  }
}
