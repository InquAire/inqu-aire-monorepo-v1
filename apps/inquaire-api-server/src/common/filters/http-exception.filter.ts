import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { CustomLoggerService } from '../modules/logger/logger.service';

/**
 * HTTP Exception Response 타입
 */
interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * 인증된 사용자 정보를 포함하는 Request 타입
 */
interface RequestWithUser extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * 글로벌 HTTP Exception Filter
 * 모든 예외를 잡아서 일관된 형식으로 응답
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();

    // HTTP Exception 여부 확인
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // 에러 메시지 추출
    let message: string | string[] = 'Internal server error';
    let errorName = 'InternalServerError';

    if (isHttpException) {
      const exceptionResponse = exception.getResponse();
      errorName = exception.name;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const httpResponse = exceptionResponse as HttpExceptionResponse;
        message = httpResponse.message || message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
    }

    // 에러 로깅
    const errorLog = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      errorName,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      user: request.user?.id || 'anonymous',
      ip: request.ip,
    };

    // 심각한 에러는 error 레벨로 로깅
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception)
      );
    } else {
      // 클라이언트 에러는 warn 레벨로 로깅
      this.logger.warn(`${request.method} ${request.url} - ${status}: ${message}`);
    }

    // 프로덕션 환경에서는 스택 트레이스 숨김
    const isProduction = process.env.NODE_ENV === 'production';

    // 응답 전송
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorName,
      ...(isProduction ? {} : { stack: errorLog.stack }),
    });
  }
}
