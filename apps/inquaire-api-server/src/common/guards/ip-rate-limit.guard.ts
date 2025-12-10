import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';

/**
 * IP 기반 Rate Limiting Guard
 *
 * IP 주소별로 요청 횟수를 제한하여 DDoS 공격 및 과도한 요청을 방어합니다.
 */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  // 데코레이터 메타데이터 키
  private static readonly RATE_LIMIT_KEY = 'ipRateLimit';

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    private readonly logger: CustomLoggerService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 데코레이터에서 설정된 Rate Limit 가져오기
    const rateLimitConfig = this.reflector.getAllAndOverride<{
      limit: number;
      windowMs: number;
    } | null>(IpRateLimitGuard.RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    // Rate Limit 설정이 없으면 통과
    if (!rateLimitConfig) {
      return true;
    }

    const { limit, windowMs } = rateLimitConfig;

    // IP 주소 추출
    const ip = this.getClientIp(request);

    if (!ip) {
      this.logger.warn('Failed to extract client IP', 'IpRateLimitGuard');
      return true; // IP를 추출할 수 없는 경우 통과 (보수적 접근)
    }

    // Redis 키 생성
    const cacheKey = `rate-limit:ip:${ip}:${request.path}`;

    // 현재 요청 횟수 가져오기
    const currentCount = (await this.cacheService.get<number>(cacheKey)) || 0;

    // Rate Limit 초과 확인
    if (currentCount >= limit) {
      this.logger.warn('Rate limit exceeded', 'IpRateLimitGuard', {
        ip,
        path: request.path,
        limit,
        currentCount,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests from this IP. Please try again later.',
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

    return true;
  }

  /**
   * 클라이언트 IP 주소 추출
   *
   * Load Balancer, Proxy, Cloudflare 등을 고려하여 실제 IP를 추출합니다.
   */
  private getClientIp(request: Request): string | null {
    // 1. Cloudflare의 CF-Connecting-IP 헤더 (가장 신뢰할 수 있음)
    const cfIp = request.headers['cf-connecting-ip'];
    if (cfIp && typeof cfIp === 'string') {
      return cfIp;
    }

    // 2. X-Forwarded-For 헤더 (프록시/로드밸런서)
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor && typeof xForwardedFor === 'string') {
      // X-Forwarded-For: client, proxy1, proxy2
      // 첫 번째 IP가 실제 클라이언트 IP
      const ips = xForwardedFor.split(',').map(ip => ip.trim());
      if (ips.length > 0 && ips[0]) {
        return ips[0];
      }
    }

    // 3. X-Real-IP 헤더 (Nginx 등)
    const xRealIp = request.headers['x-real-ip'];
    if (xRealIp && typeof xRealIp === 'string') {
      return xRealIp;
    }

    // 4. request.ip (Express 기본)
    if (request.ip) {
      return request.ip;
    }

    // 5. Socket의 remote address
    if (request.socket?.remoteAddress) {
      return request.socket.remoteAddress;
    }

    return null;
  }
}

/**
 * IP 기반 Rate Limit 데코레이터
 *
 * @param limit - 시간 윈도우 내 최대 요청 횟수
 * @param windowMs - 시간 윈도우 (밀리초)
 *
 * @example
 * ```typescript
 * @IpRateLimit(100, 60000) // 1분에 100개 요청
 * @Get('data')
 * getData() {
 *   return this.service.getData();
 * }
 * ```
 */
export const IpRateLimit = (limit: number, windowMs: number) => {
  const RATE_LIMIT_KEY = 'ipRateLimit';

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
