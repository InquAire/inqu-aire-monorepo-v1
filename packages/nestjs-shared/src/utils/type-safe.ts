/**
 * 타입 안전한 유틸리티 함수들
 */

/**
 * 안전한 구조 분해 할당을 위한 유틸리티 함수
 * @param payload - 구조 분해할 객체
 * @param keys - 추출할 키들
 * @returns 부분적으로 채워진 객체
 */
export function safeDestructure<T extends Record<string, unknown>>(
  payload: unknown,
  keys: (keyof T)[]
): Partial<T> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const result: Partial<T> = {};
  for (const key of keys) {
    if (key in payload) {
      result[key] = (payload as T)[key];
    }
  }
  return result;
}

/**
 * unknown 타입을 string으로 안전하게 변환
 * @param value - 변환할 값
 * @returns string 또는 undefined
 */
export function safeString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * unknown 타입을 number로 안전하게 변환
 * @param value - 변환할 값
 * @returns number 또는 undefined
 */
export function safeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && !isNaN(value) ? value : undefined;
}

/**
 * unknown 타입을 boolean으로 안전하게 변환
 * @param value - 변환할 값
 * @returns boolean 또는 undefined
 */
export function safeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * unknown 타입을 배열로 안전하게 변환
 * @param value - 변환할 값
 * @returns 배열 또는 undefined
 */
export function safeArray<T = unknown>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

/**
 * unknown 타입을 객체로 안전하게 변환
 * @param value - 변환할 값
 * @returns 객체 또는 undefined
 */
export function safeObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * 타입 가드: ReadableStream인지 확인
 * @param value - 확인할 값
 * @returns ReadableStream 여부
 */
export function isReadableStream(value: unknown): value is ReadableStream {
  return value !== null && typeof value === 'object' && 'getReader' in value;
}

/**
 * 타입 가드: Blob인지 확인
 * @param value - 확인할 값
 * @returns Blob 여부
 */
export function isBlob(value: unknown): value is Blob {
  return value !== null && typeof value === 'object' && 'arrayBuffer' in value;
}

/**
 * 타입 가드: Error인지 확인
 * @param value - 확인할 값
 * @returns Error 여부
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * 안전한 에러 메시지 추출
 * @param error - 에러 객체
 * @param maxLength - 최대 길이 (기본값: 500)
 * @returns 에러 메시지
 */
export function safeErrorMessage(error: unknown, maxLength = 500): string {
  if (isError(error)) {
    return error.message.slice(0, maxLength);
  }
  return 'Unknown error';
}

/**
 * 안전한 에러 스택 추출
 * @param error - 에러 객체
 * @returns 에러 스택 또는 undefined
 */
export function safeErrorStack(error: unknown): string | undefined {
  return isError(error) ? error.stack : undefined;
}

/**
 * JsonArray를 특정 타입의 배열로 안전하게 변환
 * @param jsonArray - Prisma의 JsonArray 타입
 * @param validator - 각 요소를 검증하는 함수
 * @returns 변환된 배열 또는 null
 */
export function safeJsonArray<T>(
  jsonArray: unknown,
  validator: (item: unknown) => item is T
): T[] | null {
  if (!Array.isArray(jsonArray)) {
    return null;
  }

  const result: T[] = [];
  for (const item of jsonArray) {
    if (validator(item)) {
      result.push(item);
    }
  }

  return result.length > 0 ? result : null;
}

/**
 * 비디오 챕터 객체인지 확인하는 타입 가드
 * @param item - 확인할 객체
 * @returns CustomerVideoChapterRes 여부
 */
export function isVideoChapter(item: unknown): item is { startSec: number; title: string } {
  if (item === null || typeof item !== 'object') {
    return false;
  }

  const obj = item as Record<string, unknown>;
  return typeof obj.startSec === 'number' && typeof obj.title === 'string';
}
