import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import type { AuthenticatedRequest } from '@/common/types/authenticated-request.interface';

/**
 * 사용자별 Rate Limiting Guard
 *
 * 인증된 사용자별로 요청 횟수를 제한하여 과도한 사용을 방지합니다.
 */
@Injectable()
export class UserRateLimitGuard implements CanActivate {
  // 데코레이터 메타데이터 키
  private static readonly RATE_LIMIT_KEY = 'userRateLimit';

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    private readonly logger: CustomLoggerService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // 데코레이터에서 설정된 Rate Limit 가져오기
    const rateLimitConfig = this.reflector.getAllAndOverride<{
      limit: number;
      windowMs: number;
    } | null>(UserRateLimitGuard.RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    // Rate Limit 설정이 없으면 통과
    if (!rateLimitConfig) {
      return true;
    }

    const { limit, windowMs } = rateLimitConfig;

    // 인증된 사용자 확인
    const user = request.user;

    if (!user || !user.id) {
      // 비인증 사용자는 IP 기반 Rate Limiting으로 처리
      this.logger.debug('Unauthenticated user - skipping user rate limit', 'UserRateLimitGuard');
      return true;
    }

    const userId = user.id;

    // Redis 키 생성
    const cacheKey = `rate-limit:user:${userId}:${request.path}`;

    // 현재 요청 횟수 가져오기
    const currentCount = (await this.cacheService.get<number>(cacheKey)) || 0;

    // Rate Limit 초과 확인
    if (currentCount >= limit) {
      this.logger.warn('User rate limit exceeded', 'UserRateLimitGuard', {
        userId,
        path: request.path,
        limit,
        currentCount,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'You have made too many requests. Please try again later.',
          error: 'Rate Limit Exceeded',
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // 요청 횟수 증가
    await this.cacheService.set(cacheKey, currentCount + 1, Math.floor(windowMs / 1000));

    // Rate Limit 헤더 추가
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', limit.toString());
    response.setHeader('X-RateLimit-Remaining', (limit - currentCount - 1).toString());
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

    this.logger.debug('User rate limit check passed', 'UserRateLimitGuard', {
      userId,
      path: request.path,
      remaining: limit - currentCount - 1,
    });

    return true;
  }
}

/**
 * 사용자별 Rate Limit 데코레이터
 *
 * @param limit - 시간 윈도우 내 최대 요청 횟수
 * @param windowMs - 시간 윈도우 (밀리초)
 *
 * @example
 * ```typescript
 * @UserRateLimit(60, 60000) // 1분에 60개 요청
 * @Get('my-data')
 * getMyData(@Request() req: AuthenticatedRequest) {
 *   return this.service.getUserData(req.user.id);
 * }
 * ```
 */
export const UserRateLimit = (limit: number, windowMs: number) => {
  const RATE_LIMIT_KEY = 'userRateLimit';

  return (target: object, _propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      // Method decorator
      Reflect.defineMetadata(RATE_LIMIT_KEY, { limit, windowMs }, descriptor.value);
    } else {
      // Class decorator
      Reflect.defineMetadata(RATE_LIMIT_KEY, { limit, windowMs }, target);
    }

    return descriptor;
  };
};
