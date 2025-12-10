/**
 * 공통 예외 처리 모듈
 *
 * 표준화된 에러 코드와 비즈니스 예외 클래스를 제공합니다.
 */

// Error codes
export { ErrorCode, ErrorCodeToHttpStatus, ErrorCodeToMessage } from './error-codes';

// Business exception
export {
  BusinessException,
  throwResourceNotFound,
  throwAccessDenied,
  throwDuplicateResource,
  throwBusinessRuleViolation,
  throwInvalidInput,
} from './business.exception';
