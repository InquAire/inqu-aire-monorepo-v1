import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

import { MetricsService } from '../modules/metrics/metrics.service';

/**
 * Metrics Interceptor
 *
 * Automatically records HTTP request metrics for Prometheus
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();
    const method = request.method;
    const route = this.getRoute(context);

    return next.handle().pipe(
      tap({
        next: () => {
          const durationSeconds = (Date.now() - startTime) / 1000;
          this.metricsService.recordHttpRequest(method, route, response.statusCode, durationSeconds);
        },
        error: (error: unknown) => {
          const durationSeconds = (Date.now() - startTime) / 1000;
          const statusCode =
            error && typeof error === 'object' && 'status' in error
              ? (error.status as number)
              : 500;
          this.metricsService.recordHttpRequest(method, route, statusCode, durationSeconds);
        },
      })
    );
  }

  /**
   * Extract route pattern from execution context
   */
  private getRoute(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();

    // Try to get route from handler/controller metadata
    const route = Reflect.getMetadata('path', handler) || Reflect.getMetadata('path', controller);

    if (route) {
      return route;
    }

    // Fallback to URL path
    const request = context.switchToHttp().getRequest<Request>();
    return request.route?.path || request.path;
  }
}
