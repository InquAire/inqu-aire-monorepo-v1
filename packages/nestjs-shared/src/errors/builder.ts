import { ErrorCode } from './codes';

export function errorResponse(
  code: ErrorCode | string,
  message: string,
  meta?: Record<string, unknown>
) {
  return {
    success: false,
    data: null,
    error: { code, message },
    ...(meta ? { meta } : {}),
  } as const;
}

export function successResponse<T>(data: T, meta?: Record<string, unknown>) {
  return { success: true, data, error: null, ...(meta ? { meta } : {}) } as const;
}
