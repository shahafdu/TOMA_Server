import { z } from 'zod';

/**
 * All instants cross the API as ISO-8601 UTC strings (never locale strings — that was the
 * source of several legacy date bugs, plan §3.2 B-11). Parsed to `Date` only at the edges.
 */
export const IsoDateTime = z.string().datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTime>;

/** A calendar date with no time component, `YYYY-MM-DD`. */
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
export type IsoDate = z.infer<typeof IsoDate>;

export const Email = z.string().email();
export type Email = z.infer<typeof Email>;

/** Standard cursor/offset pagination envelope for list endpoints (plan §2.2). */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}

export const PageQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(25),
});
export type PageQuery = z.infer<typeof PageQuery>;
