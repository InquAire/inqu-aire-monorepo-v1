import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

import { sanitizeInput } from '@/common/utils/sanitizer.util';

/**
 * XSS 방지를 위한 입력 데이터 Sanitization 인터셉터
 *
 * 모든 요청의 body, query, params를 sanitize하여 XSS 공격 방지
 */
@Injectable()
export class XssSanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    // Request body sanitize
    if (request.body) {
      request.body = sanitizeInput(request.body) as typeof request.body;
    }

    // Query parameters sanitize (mutate in place to avoid setter issues)
    if (request.query) {
      const sanitizedQuery = sanitizeInput(request.query) as typeof request.query;
      Object.keys(request.query).forEach(
        key => delete (request.query as Record<string, unknown>)[key]
      );
      Object.assign(request.query as Record<string, unknown>, sanitizedQuery);
    }

    // URL parameters sanitize (mutate in place to avoid setter issues)
    if (request.params) {
      const sanitizedParams = sanitizeInput(request.params) as typeof request.params;
      Object.keys(request.params).forEach(
        key => delete (request.params as Record<string, unknown>)[key]
      );
      Object.assign(request.params as Record<string, unknown>, sanitizedParams);
    }

    return next.handle();
  }
}
