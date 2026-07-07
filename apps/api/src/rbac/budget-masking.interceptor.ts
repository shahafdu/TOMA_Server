import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { canSeeBudgetData, type Role } from '@toma/shared';
import type { Request } from 'express';
import { map, type Observable } from 'rxjs';

/** Budget-sensitive fields stripped from responses for roles that may not see them (plan §2.4). */
const BUDGET_FIELDS = ['price', 'budget', 'yearlyBudget', 'amount'];

/**
 * Field-level masking (plan §2.4): removes budget/price fields from the response body for any
 * role that cannot see budget data (everyone except HR and Developer). Because the stripping
 * happens on the way out, the values never reach the client — they can't be recovered from the
 * network tab, unlike client-side hiding.
 */
@Injectable()
export class BudgetMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const role = req.session?.role as Role | undefined;
    const allowed = role ? canSeeBudgetData(role) : false;
    if (allowed) return next.handle();
    return next.handle().pipe(map((body) => stripKeys(body, BUDGET_FIELDS)));
  }
}

function stripKeys(value: unknown, keys: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => stripKeys(v, keys));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (keys.includes(k)) continue;
      out[k] = stripKeys(v, keys);
    }
    return out;
  }
  return value;
}
