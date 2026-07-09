import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Renders every error as `application/problem+json` (RFC 9457), the format the plan's API
 * contract commits to (§2.2). Validation failures carry their zod issues under `errors`.
 */
@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = 500;
    let title = 'Internal Server Error';
    let detail: string | undefined;
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        title = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        title = (b.error as string) ?? exception.message;
        detail = typeof b.message === 'string' ? b.message : undefined;
        errors = b.errors;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    res
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title,
        status,
        ...(detail ? { detail } : {}),
        ...(errors ? { errors } : {}),
        instance: req.originalUrl,
      });
  }
}
