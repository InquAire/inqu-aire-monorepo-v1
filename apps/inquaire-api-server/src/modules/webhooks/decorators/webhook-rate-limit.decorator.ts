import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * 웹훅 전용 Rate Limiting 데코레이터
 *
 * 기본값: 채널당 분당 100개 요청
 *
 * @param limit - 허용할 요청 수
 * @param ttl - 시간 창 (초 단위)
 */
export function WebhookRateLimit(limit = 100, ttl = 60) {
  return applyDecorators(
    Throttle({
      default: {
        limit, // 요청 수
        ttl: ttl * 1000, // 시간 창 (밀리초)
      },
    })
  );
}
