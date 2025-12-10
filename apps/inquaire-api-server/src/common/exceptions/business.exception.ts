import { HttpException } from '@nestjs/common';

import { ErrorCode, ErrorCodeToHttpStatus, ErrorCodeToMessage } from './error-codes';

/**
 * 표준화된 비즈니스 예외 클래스
 *
 * 모든 비즈니스 로직 에러는 이 클래스를 사용하여 발생시켜야 합니다.
 * 에러 코드를 기반으로 일관된 형식의 에러 응답을 생성합니다.
 *
 * @example
 * ```typescript
 * // 기본 사용
 * throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
 *
 * // 커스텀 메시지 사용
 * throw new BusinessException(
 *   ErrorCode.RESOURCE_NOT_FOUND,
 *   `User with id ${userId} not found`
 * );
 *
 * // 추가 컨텍스트 제공
 * throw new BusinessException(
 *   ErrorCode.BUSINESS_QUOTA_EXCEEDED,
 *   '월간 문의 생성 한도를 초과했습니다',
 *   { limit: 1000, current: 1001 }
 * );
 * ```
 */
export class BusinessException extends HttpException {
  /** 에러 코드 */
  public readonly errorCode: ErrorCode;

  /** 추가 컨텍스트 정보 */
  public readonly context?: Record<string, any>;

  /** 에러 발생 시각 */
  public readonly timestamp: string;

  /**
   * BusinessException 생성자
   *
   * @param errorCode - 에러 코드
   * @param message - 사용자에게 표시할 메시지 (선택사항, 미제공 시 기본 메시지 사용)
   * @param context - 추가 컨텍스트 정보 (선택사항)
   */
  constructor(errorCode: ErrorCode, message?: string, context?: Record<string, any>) {
    const httpStatus = ErrorCodeToHttpStatus[errorCode];
    const finalMessage = message || ErrorCodeToMessage[errorCode];

    super(
      {
        statusCode: httpStatus,
        errorCode,
        message: finalMessage,
        timestamp: new Date().toISOString(),
        ...(context && { context }),
      },
      httpStatus,
    );

    this.errorCode = errorCode;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // 프로토타입 체인 복원 (TypeScript extends Error 이슈)
    Object.setPrototypeOf(this, BusinessException.prototype);
  }

  /**
   * 에러 응답 객체를 반환
   */
  getResponse(): Record<string, any> {
    return super.getResponse() as Record<string, any>;
  }

  /**
   * HTTP 상태 코드를 반환
   */
  getStatus(): number {
    return super.getStatus();
  }

  /**
   * 에러를 JSON 형식으로 변환
   */
  toJSON(): Record<string, any> {
    return {
      statusCode: this.getStatus(),
      errorCode: this.errorCode,
      message: this.message,
      timestamp: this.timestamp,
      ...(this.context && { context: this.context }),
    };
  }
}

/**
 * 헬퍼 함수: 리소스를 찾을 수 없을 때 사용
 */
export function throwResourceNotFound(resourceType: string, resourceId: string): never {
  throw new BusinessException(
    ErrorCode.RESOURCE_NOT_FOUND,
    `${resourceType}을(를) 찾을 수 없습니다`,
    { resourceType, resourceId },
  );
}

/**
 * 헬퍼 함수: 권한이 없을 때 사용
 */
export function throwAccessDenied(resourceType: string, resourceId?: string): never {
  throw new BusinessException(
    ErrorCode.RESOURCE_ACCESS_DENIED,
    `${resourceType}에 대한 접근 권한이 없습니다`,
    { resourceType, resourceId },
  );
}

/**
 * 헬퍼 함수: 중복된 리소스가 있을 때 사용
 */
export function throwDuplicateResource(resourceType: string, field: string, value: any): never {
  throw new BusinessException(
    ErrorCode.RESOURCE_ALREADY_EXISTS,
    `이미 존재하는 ${resourceType}입니다`,
    { resourceType, field, value },
  );
}

/**
 * 헬퍼 함수: 비즈니스 규칙 위반 시 사용
 */
export function throwBusinessRuleViolation(rule: string, details?: string): never {
  throw new BusinessException(
    ErrorCode.BUSINESS_RULE_VIOLATION,
    details || `비즈니스 규칙을 위반했습니다: ${rule}`,
    { rule },
  );
}

/**
 * 헬퍼 함수: 유효하지 않은 입력값 시 사용
 */
export function throwInvalidInput(field: string, reason: string): never {
  throw new BusinessException(ErrorCode.VALIDATION_INVALID_INPUT, `${field}: ${reason}`, {
    field,
    reason,
  });
}
