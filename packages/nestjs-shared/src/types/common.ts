export type EntityId = string; // API는 문자열 ID 원칙
export type IsoDateString = string;
export type Milliseconds = number;
export type LocaleCode = string;

export type Ok<T> = { ok: true; value: T };
export type Err<E = Error> = { ok: false; error: E };
export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  data: null;
  error: { code: string; message: string };
  meta?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
