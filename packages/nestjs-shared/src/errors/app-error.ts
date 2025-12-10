import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode } from './codes';

export type AppErrorBody = {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown> | null;
};

export class AppHttpException extends HttpException {
  constructor(
    status: number,
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown> | null
  ) {
    super({ code, message, ...(details ? { details } : {}) }, status);
  }

  static badRequest(
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown> | null
  ) {
    return new AppHttpException(HttpStatus.BAD_REQUEST, code, message, details);
  }
  static unauthorized(
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown> | null
  ) {
    return new AppHttpException(HttpStatus.UNAUTHORIZED, code, message, details);
  }
  static forbidden(
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown> | null
  ) {
    return new AppHttpException(HttpStatus.FORBIDDEN, code, message, details);
  }
  static notFound(
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown> | null
  ) {
    return new AppHttpException(HttpStatus.NOT_FOUND, code, message, details);
  }
  static conflict(
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown> | null
  ) {
    return new AppHttpException(HttpStatus.CONFLICT, code, message, details);
  }

  static internalError(
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown> | null
  ) {
    return new AppHttpException(HttpStatus.INTERNAL_SERVER_ERROR, code, message, details);
  }
}
