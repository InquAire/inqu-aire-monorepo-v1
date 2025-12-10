/**
 * 표준화된 에러 코드 정의
 *
 * 에러 코드 형식: {카테고리}_{상세}
 * - AUTH_*: 인증/인가 관련
 * - VALIDATION_*: 입력 검증 관련
 * - BUSINESS_*: 비즈니스 로직 관련
 * - RESOURCE_*: 리소스 관련
 * - EXTERNAL_*: 외부 서비스 관련
 * - SYSTEM_*: 시스템 관련
 */
export enum ErrorCode {
  // ========== 인증/인가 (AUTH) ==========
  /** 인증 실패 - 잘못된 자격 증명 */
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  /** 액세스 토큰이 만료됨 */
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  /** 유효하지 않은 토큰 */
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  /** 리프레시 토큰이 만료됨 */
  AUTH_REFRESH_TOKEN_EXPIRED = 'AUTH_REFRESH_TOKEN_EXPIRED',
  /** 유효하지 않은 리프레시 토큰 */
  AUTH_INVALID_REFRESH_TOKEN = 'AUTH_INVALID_REFRESH_TOKEN',
  /** 인증 필요 */
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  /** 권한 부족 */
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  /** 이미 존재하는 이메일 */
  AUTH_EMAIL_ALREADY_EXISTS = 'AUTH_EMAIL_ALREADY_EXISTS',

  // ========== 입력 검증 (VALIDATION) ==========
  /** 유효하지 않은 입력값 */
  VALIDATION_INVALID_INPUT = 'VALIDATION_INVALID_INPUT',
  /** 필수 필드 누락 */
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  /** 유효하지 않은 형식 */
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  /** 비밀번호 복잡도 요구사항 미충족 */
  VALIDATION_WEAK_PASSWORD = 'VALIDATION_WEAK_PASSWORD',
  /** 유효하지 않은 이메일 형식 */
  VALIDATION_INVALID_EMAIL = 'VALIDATION_INVALID_EMAIL',
  /** 값이 허용 범위를 벗어남 */
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',

  // ========== 비즈니스 로직 (BUSINESS) ==========
  /** 비즈니스 규칙 위반 */
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  /** 중복된 엔티티 */
  BUSINESS_DUPLICATE_ENTITY = 'BUSINESS_DUPLICATE_ENTITY',
  /** 작업이 허용되지 않음 */
  BUSINESS_OPERATION_NOT_ALLOWED = 'BUSINESS_OPERATION_NOT_ALLOWED',
  /** 상태 전환 불가 */
  BUSINESS_INVALID_STATE_TRANSITION = 'BUSINESS_INVALID_STATE_TRANSITION',
  /** 할당량 초과 */
  BUSINESS_QUOTA_EXCEEDED = 'BUSINESS_QUOTA_EXCEEDED',

  // ========== 리소스 (RESOURCE) ==========
  /** 리소스를 찾을 수 없음 */
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  /** 리소스 접근 거부 */
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',
  /** 리소스가 이미 존재함 */
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  /** 리소스가 이미 삭제됨 */
  RESOURCE_ALREADY_DELETED = 'RESOURCE_ALREADY_DELETED',
  /** 리소스 충돌 */
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // ========== 외부 서비스 (EXTERNAL) ==========
  /** 외부 API 호출 실패 */
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  /** OpenAI API 에러 */
  EXTERNAL_OPENAI_ERROR = 'EXTERNAL_OPENAI_ERROR',
  /** 웹훅 전송 실패 */
  EXTERNAL_WEBHOOK_ERROR = 'EXTERNAL_WEBHOOK_ERROR',
  /** 외부 서비스 타임아웃 */
  EXTERNAL_SERVICE_TIMEOUT = 'EXTERNAL_SERVICE_TIMEOUT',
  /** 외부 서비스 이용 불가 */
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',

  // ========== 시스템 (SYSTEM) ==========
  /** 내부 서버 에러 */
  SYSTEM_INTERNAL_ERROR = 'SYSTEM_INTERNAL_ERROR',
  /** 데이터베이스 에러 */
  SYSTEM_DATABASE_ERROR = 'SYSTEM_DATABASE_ERROR',
  /** 캐시 에러 */
  SYSTEM_CACHE_ERROR = 'SYSTEM_CACHE_ERROR',
  /** 설정 에러 */
  SYSTEM_CONFIGURATION_ERROR = 'SYSTEM_CONFIGURATION_ERROR',
  /** 서비스 이용 불가 */
  SYSTEM_SERVICE_UNAVAILABLE = 'SYSTEM_SERVICE_UNAVAILABLE',

  // ========== 특수 케이스 ==========
  /** 알 수 없는 에러 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 에러 코드별 HTTP 상태 코드 매핑
 */
export const ErrorCodeToHttpStatus: Record<ErrorCode, number> = {
  // AUTH - 401 Unauthorized / 403 Forbidden
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_INVALID_TOKEN]: 401,
  [ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: 401,
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.AUTH_EMAIL_ALREADY_EXISTS]: 409,

  // VALIDATION - 400 Bad Request
  [ErrorCode.VALIDATION_INVALID_INPUT]: 400,
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: 400,
  [ErrorCode.VALIDATION_INVALID_FORMAT]: 400,
  [ErrorCode.VALIDATION_WEAK_PASSWORD]: 400,
  [ErrorCode.VALIDATION_INVALID_EMAIL]: 400,
  [ErrorCode.VALIDATION_OUT_OF_RANGE]: 400,

  // BUSINESS - 400 Bad Request / 422 Unprocessable Entity
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 422,
  [ErrorCode.BUSINESS_DUPLICATE_ENTITY]: 409,
  [ErrorCode.BUSINESS_OPERATION_NOT_ALLOWED]: 422,
  [ErrorCode.BUSINESS_INVALID_STATE_TRANSITION]: 422,
  [ErrorCode.BUSINESS_QUOTA_EXCEEDED]: 429,

  // RESOURCE - 404 Not Found / 409 Conflict
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_ACCESS_DENIED]: 403,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCode.RESOURCE_ALREADY_DELETED]: 410,
  [ErrorCode.RESOURCE_CONFLICT]: 409,

  // EXTERNAL - 502 Bad Gateway / 503 Service Unavailable
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.EXTERNAL_OPENAI_ERROR]: 502,
  [ErrorCode.EXTERNAL_WEBHOOK_ERROR]: 502,
  [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: 504,
  [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 503,

  // SYSTEM - 500 Internal Server Error
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: 500,
  [ErrorCode.SYSTEM_DATABASE_ERROR]: 500,
  [ErrorCode.SYSTEM_CACHE_ERROR]: 500,
  [ErrorCode.SYSTEM_CONFIGURATION_ERROR]: 500,
  [ErrorCode.SYSTEM_SERVICE_UNAVAILABLE]: 503,

  // SPECIAL
  [ErrorCode.UNKNOWN_ERROR]: 500,
};

/**
 * 에러 코드별 기본 메시지 (한글)
 */
export const ErrorCodeToMessage: Record<ErrorCode, string> = {
  // AUTH
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: '이메일 또는 비밀번호가 올바르지 않습니다',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: '액세스 토큰이 만료되었습니다',
  [ErrorCode.AUTH_INVALID_TOKEN]: '유효하지 않은 토큰입니다',
  [ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED]: '리프레시 토큰이 만료되었습니다',
  [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: '유효하지 않은 리프레시 토큰입니다',
  [ErrorCode.AUTH_REQUIRED]: '인증이 필요합니다',
  [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: '권한이 부족합니다',
  [ErrorCode.AUTH_EMAIL_ALREADY_EXISTS]: '이미 사용 중인 이메일입니다',

  // VALIDATION
  [ErrorCode.VALIDATION_INVALID_INPUT]: '유효하지 않은 입력값입니다',
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: '필수 필드가 누락되었습니다',
  [ErrorCode.VALIDATION_INVALID_FORMAT]: '형식이 올바르지 않습니다',
  [ErrorCode.VALIDATION_WEAK_PASSWORD]: '비밀번호가 보안 요구사항을 충족하지 않습니다',
  [ErrorCode.VALIDATION_INVALID_EMAIL]: '이메일 형식이 올바르지 않습니다',
  [ErrorCode.VALIDATION_OUT_OF_RANGE]: '값이 허용 범위를 벗어났습니다',

  // BUSINESS
  [ErrorCode.BUSINESS_RULE_VIOLATION]: '비즈니스 규칙을 위반했습니다',
  [ErrorCode.BUSINESS_DUPLICATE_ENTITY]: '중복된 데이터가 존재합니다',
  [ErrorCode.BUSINESS_OPERATION_NOT_ALLOWED]: '허용되지 않는 작업입니다',
  [ErrorCode.BUSINESS_INVALID_STATE_TRANSITION]: '유효하지 않은 상태 전환입니다',
  [ErrorCode.BUSINESS_QUOTA_EXCEEDED]: '할당량을 초과했습니다',

  // RESOURCE
  [ErrorCode.RESOURCE_NOT_FOUND]: '리소스를 찾을 수 없습니다',
  [ErrorCode.RESOURCE_ACCESS_DENIED]: '리소스에 대한 접근 권한이 없습니다',
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: '리소스가 이미 존재합니다',
  [ErrorCode.RESOURCE_ALREADY_DELETED]: '리소스가 이미 삭제되었습니다',
  [ErrorCode.RESOURCE_CONFLICT]: '리소스 충돌이 발생했습니다',

  // EXTERNAL
  [ErrorCode.EXTERNAL_API_ERROR]: '외부 API 호출 중 오류가 발생했습니다',
  [ErrorCode.EXTERNAL_OPENAI_ERROR]: 'OpenAI API 오류가 발생했습니다',
  [ErrorCode.EXTERNAL_WEBHOOK_ERROR]: '웹훅 전송 중 오류가 발생했습니다',
  [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: '외부 서비스 요청 시간이 초과되었습니다',
  [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: '외부 서비스를 사용할 수 없습니다',

  // SYSTEM
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: '내부 서버 오류가 발생했습니다',
  [ErrorCode.SYSTEM_DATABASE_ERROR]: '데이터베이스 오류가 발생했습니다',
  [ErrorCode.SYSTEM_CACHE_ERROR]: '캐시 오류가 발생했습니다',
  [ErrorCode.SYSTEM_CONFIGURATION_ERROR]: '설정 오류가 발생했습니다',
  [ErrorCode.SYSTEM_SERVICE_UNAVAILABLE]: '서비스를 일시적으로 사용할 수 없습니다',

  // SPECIAL
  [ErrorCode.UNKNOWN_ERROR]: '알 수 없는 오류가 발생했습니다',
};
