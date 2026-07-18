import { Injectable } from '@nestjs/common';
import {
  type SetTrainingGoalsInput,
  type TrainingGoal,
  TrainingGoal as TrainingGoalSchema,
} from '@toma/shared';
import { GoalsRepository } from './goals.repository.js';

@Injectable()
export class GoalsService {
  constructor(private readonly repo: GoalsRepository) {}

  async forYear(year: number): Promise<TrainingGoal[]> {
    const rows = await this.repo.forYear(year);
    return rows.map((r) => TrainingGoalSchema.parse({ year, ...r }));
  }

  async replace(input: SetTrainingGoalsInput): Promise<TrainingGoal[]> {
    await this.repo.replaceForYear(input.year, input.goals);
    return this.forYear(input.year);
  }
}
