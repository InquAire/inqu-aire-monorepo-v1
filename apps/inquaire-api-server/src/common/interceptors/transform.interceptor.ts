import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 표준 응답 형식
 */
export interface Response<T> {
  success: boolean;
  statusCode: number;
  timestamp: string;
  path: string;
  data: T;
  message?: string;
}

/**
 * 페이지네이션 메타 정보
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  [key: string]: unknown;
}

/**
 * 페이지네이션 응답 형식
 */
export interface PaginatedResponse<T> extends Response<T> {
  meta: PaginationMeta;
}

/**
 * 글로벌 Transform Interceptor
 * 모든 응답을 일관된 형식으로 변환
 * (HTTP 로깅은 LoggingInterceptor에서 처리)
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();

    return next.handle().pipe(
      // 응답 변환
      map(data => {
        const response = ctx.getResponse();

        // 이미 변환된 응답인 경우 (예: 파일 다운로드)
        if (data === undefined || data === null) {
          return data;
        }

        // 페이지네이션 응답 처리
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            statusCode: response.statusCode,
            timestamp: new Date().toISOString(),
            path: request.url,
            data: data.data,
            meta: data.meta,
          } as PaginatedResponse<unknown>;
        }

        // 일반 응답 변환
        return {
          success: true,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
          data,
        };
      })
    );
  }
}
