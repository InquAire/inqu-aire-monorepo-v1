/**
 * API 에러 응답 타입
 */
export interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
  [key: string]: unknown;
}

/**
 * Axios 에러 타입
 */
export interface AxiosError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
  };
  message?: string;
}

/**
 * 에러 객체에서 사용자에게 표시할 메시지를 추출합니다.
 */
export function getErrorMessage(error: unknown): string {
  // Axios 에러인 경우
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError;
    const responseData = axiosError.response?.data;

    if (responseData?.message) {
      return responseData.message;
    }

    if (responseData?.error) {
      return responseData.error;
    }
  }

  // 일반 Error 객체인 경우
  if (error instanceof Error) {
    return error.message;
  }

  // 문자열인 경우
  if (typeof error === 'string') {
    return error;
  }

  // 알 수 없는 에러
  return '알 수 없는 오류가 발생했습니다';
}

/**
 * 에러 객체에서 상태 코드를 추출합니다.
 */
export function getErrorStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status;
  }
  return undefined;
}

/**
 * 에러가 특정 상태 코드인지 확인합니다.
 */
export function isErrorStatus(error: unknown, statusCode: number): boolean {
  return getErrorStatusCode(error) === statusCode;
}

/**
 * 에러가 인증 에러인지 확인합니다 (401)
 */
export function isAuthError(error: unknown): boolean {
  return isErrorStatus(error, 401);
}

/**
 * 에러가 권한 에러인지 확인합니다 (403)
 */
export function isForbiddenError(error: unknown): boolean {
  return isErrorStatus(error, 403);
}

/**
 * 에러가 Not Found 에러인지 확인합니다 (404)
 */
export function isNotFoundError(error: unknown): boolean {
  return isErrorStatus(error, 404);
}

/**
 * 에러가 서버 에러인지 확인합니다 (500번대)
 */
export function isServerError(error: unknown): boolean {
  const statusCode = getErrorStatusCode(error);
  return statusCode !== undefined && statusCode >= 500 && statusCode < 600;
}
