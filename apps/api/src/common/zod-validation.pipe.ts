import { type PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

/**
 * Validates and parses a value against a zod schema from @toma/shared, so the API enforces the
 * exact same contract the client is generated from. On failure raises a 422 whose issues the
 * ProblemJsonFilter surfaces under `errors`.
 *
 *   @Body(new ZodValidationPipe(CreateCourseInput)) input: CreateCourseInput
 */
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        errors: result.error.issues,
      });
    }
    return result.data;
  }
}
