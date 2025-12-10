import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { SKIP_CSRF_KEY } from '@/common/decorators/skip-csrf.decorator';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';

/**
 * CSRF (Cross-Site Request Forgery) 보호 Guard
 *
 * Origin/Referer 헤더 검증을 통한 CSRF 공격 방지
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // 테스트/퍼포먼스 환경에서 CSRF 검사 비활성화 플래그
    if (process.env.DISABLE_CSRF === 'true') {
      this.logger.log('CSRF check skipped - DISABLE_CSRF flag', 'CsrfGuard');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // @SkipCsrf() 데코레이터가 적용된 엔드포인트는 CSRF 검증 스킵
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      this.logger.log('CSRF check skipped - @SkipCsrf() decorator', 'CsrfGuard');
      return true;
    }

    // GET, HEAD, OPTIONS 요청은 CSRF 검증 스킵 (읽기 전용)
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Origin 또는 Referer 헤더 확인
    const origin = this.getOrigin(request);
    const allowedOrigins = this.getAllowedOrigins();

    if (!origin) {
      this.logger.warn('CSRF check failed - No Origin or Referer header', 'CsrfGuard', {
        method,
        path: request.path,
      });
      throw new ForbiddenException('Missing Origin or Referer header');
    }

    // Origin이 허용된 목록에 있는지 확인
    const isAllowed = this.isOriginAllowed(origin, allowedOrigins);

    if (!isAllowed) {
      this.logger.warn('CSRF check failed - Origin not allowed', 'CsrfGuard', {
        origin,
        allowedOrigins,
        method,
        path: request.path,
      });
      throw new ForbiddenException(`CSRF check failed - Origin not allowed: ${origin}`);
    }

    this.logger.log(`CSRF check passed: ${origin}`, 'CsrfGuard');
    return true;
  }

  /**
   * Origin 또는 Referer 헤더에서 출처 추출
   */
  private getOrigin(request: Request): string | null {
    // 1. Origin 헤더 (우선순위 높음)
    const origin = request.headers.origin;
    if (origin) {
      return origin;
    }

    // 2. Referer 헤더에서 Origin 추출
    const referer = request.headers.referer;
    if (referer) {
      try {
        const url = new URL(referer);
        return url.origin;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * 허용된 Origin 목록 가져오기
   */
  private getAllowedOrigins(): string[] {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN', '');

    if (!corsOrigin) {
      // CORS_ORIGIN이 설정되지 않은 경우 현재 서버 URL 사용
      const port = this.configService.get<number>('PORT', 3000);
      return [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
    }

    // 쉼표로 구분된 여러 Origin
    return corsOrigin.split(',').map(origin => origin.trim());
  }

  /**
   * Origin이 허용된 목록에 포함되는지 확인
   */
  private isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
    // 정확히 일치하는 Origin 확인
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // 와일드카드 서브도메인 지원 (예: https://*.example.com)
    for (const allowed of allowedOrigins) {
      if (allowed.includes('*')) {
        // 정규식 특수문자를 이스케이프하고 * 만 .* 로 변환
        const escapedPattern = allowed
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // 정규식 특수문자 이스케이프
          .replace(/\*/g, '.*'); // * -> .*
        const regex = new RegExp('^' + escapedPattern + '$');
        if (regex.test(origin)) {
          return true;
        }
      }
    }

    return false;
  }
}
