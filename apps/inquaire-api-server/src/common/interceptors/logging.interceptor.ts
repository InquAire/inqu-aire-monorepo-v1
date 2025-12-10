import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { CustomLoggerService } from '../modules/logger/logger.service';

/**
 * HTTP Logging Interceptor
 *
 * Logs all HTTP requests and responses with:
 * - Request ID (correlation ID)
 * - Method, URL, status code
 * - Request duration
 * - User information (if authenticated)
 * - Error details (if request failed)
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { user?: { id: string } }>();
    const response = ctx.getResponse<Response>();

    // Generate or extract request ID
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    request.headers['x-request-id'] = requestId;
    response.setHeader('X-Request-ID', requestId);

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = request.user?.id;

    const startTime = Date.now();

    // Skip logging for health checks and metrics
    const skipPaths = ['/health', '/metrics', '/favicon.ico'];
    const shouldSkip = skipPaths.some(path => url.includes(path));

    if (!shouldSkip) {
      this.logger.log('Incoming Request', 'HTTP', {
        requestId,
        method,
        url,
        ip,
        userAgent,
        userId,
      });
    }

    return next.handle().pipe(
      tap(() => {
        if (!shouldSkip) {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.logHttpRequest(method, url, statusCode, duration, {
            requestId,
            ip,
            userId,
            userAgent,
          });
        }
      }),
      catchError(error => {
        if (!shouldSkip) {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `Request Failed: ${method} ${url}`,
            error.stack,
            'HTTP',
            {
              requestId,
              method,
              url,
              statusCode,
              duration,
              ip,
              userId,
              userAgent,
              errorName: error.name,
              errorMessage: error.message,
            }
          );
        }

        throw error;
      })
    );
  }
}
