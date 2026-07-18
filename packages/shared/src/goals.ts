import { z } from 'zod';

/**
 * A per-discipline yearly training-hour goal (how many hours each employee should complete in
 * that discipline). Management/leadership tracks are modelled as disciplines too, so this single
 * (year, discipline) grain covers both subject-domain and management-level goals.
 */
export const TrainingGoal = z.object({
  year: z.number().int(),
  discipline: z.string().min(1).max(64),
  targetHours: z.number().nonnegative().max(9999),
});
export type TrainingGoal = z.infer<typeof TrainingGoal>;

/** HR/admin upsert of the full set of goals for one year (replaces that year's rows). */
export const SetTrainingGoalsInput = z.object({
  year: z.number().int(),
  goals: z.array(
    z.object({
      discipline: z.string().min(1).max(64),
      targetHours: z.number().nonnegative().max(9999),
    }),
  ),
});
export type SetTrainingGoalsInput = z.infer<typeof SetTrainingGoalsInput>;
