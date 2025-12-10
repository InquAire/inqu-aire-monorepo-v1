import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Response } from 'express';

import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes';
import { CustomLoggerService } from '../modules/logger/logger.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.interface';

/**
 * 표준화된 에러 응답 인터페이스
 */
interface ErrorResponse {
  success: false;
  statusCode: number;
  errorCode?: ErrorCode;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error: string;
  context?: Record<string, unknown>;
  validationErrors?: string[];
}

/**
 * Global Exception Filter with Sentry Integration
 *
 * Catches all exceptions, logs them, reports to Sentry, and returns consistent error responses
 *
 * 에러 응답 형식:
 * - BusinessException: errorCode와 context 포함
 * - ValidationException (class-validator): validationErrors 포함
 * - 기타 HttpException: 기본 형식
 * - Unknown Error: 500 응답
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.extractMessage(exception);
    const errorResponse = this.buildErrorResponse(exception, status, request, message);

    // Log with appropriate level
    this.logException(exception, status, request, message, errorResponse);

    // Report to Sentry if needed
    this.reportToSentry(exception, status, request);

    response.status(status).json(errorResponse);
  }

  /**
   * 예외에서 메시지 추출
   */
  private extractMessage(exception: unknown): string {
    if (exception instanceof BusinessException) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const msg = response.message;
        if (Array.isArray(msg)) {
          return msg.filter((m): m is string => typeof m === 'string').join(', ');
        }
        if (typeof msg === 'string') {
          return msg;
        }
      }
      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  /**
   * 에러 응답 객체 생성
   */
  private buildErrorResponse(
    exception: unknown,
    status: number,
    request: AuthenticatedRequest,
    message: string
  ): ErrorResponse {
    const baseResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: exception instanceof HttpException ? exception.name : 'InternalServerError',
    };

    // BusinessException인 경우 errorCode와 context 추가
    if (exception instanceof BusinessException) {
      return {
        ...baseResponse,
        errorCode: exception.errorCode,
        ...(exception.context && { context: exception.context }),
      };
    }

    // class-validator ValidationException인 경우 validationErrors 추가
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const msg = response.message;
        if (Array.isArray(msg)) {
          const validationErrors = msg.filter((m): m is string => typeof m === 'string');
          if (validationErrors.length > 0) {
            return {
              ...baseResponse,
              validationErrors,
            };
          }
        }
      }
    }

    return baseResponse;
  }

  /**
   * 예외 로깅
   */
  private logException(
    exception: unknown,
    status: number,
    request: AuthenticatedRequest,
    message: string,
    errorResponse: ErrorResponse
  ): void {
    const logContext = {
      statusCode: status,
      message,
      userId: request.user?.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      ...(errorResponse.errorCode && { errorCode: errorResponse.errorCode }),
      ...(errorResponse.context && { context: errorResponse.context }),
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : undefined,
        'ExceptionFilter',
        logContext
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${message}`,
        'ExceptionFilter',
        logContext
      );
    } else {
      this.logger.log(`${request.method} ${request.url} - ${message}`, 'ExceptionFilter');
    }
  }

  /**
   * Sentry에 에러 리포팅
   */
  private reportToSentry(exception: unknown, status: number, request: AuthenticatedRequest): void {
    // 5xx 에러만 Sentry에 보고
    if (status < 500) {
      return;
    }

    // BusinessException은 기록하되 낮은 우선순위로 처리
    // (비즈니스 로직 에러는 예상된 에러이므로)
    if (exception instanceof BusinessException) {
      Sentry.captureException(exception, {
        level: 'warning',
        tags: {
          path: request.url,
          method: request.method,
          statusCode: status.toString(),
          errorCode: exception.errorCode,
        },
        extra: {
          userId: request.user?.id,
          ip: request.ip,
          context: exception.context,
        },
      });
      return;
    }

    // 일반 에러는 높은 우선순위로 Sentry에 보고
    if (exception instanceof Error) {
      Sentry.captureException(exception, {
        level: 'error',
        tags: {
          path: request.url,
          method: request.method,
          statusCode: status.toString(),
        },
        extra: {
          userId: request.user?.id,
          ip: request.ip,
          body: request.body,
          query: request.query,
          params: request.params,
        },
      });
    }
  }
}
