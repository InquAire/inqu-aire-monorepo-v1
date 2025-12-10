import { Injectable } from '@nestjs/common';

import { CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';

/**
 * 웹훅 Replay Attack 방지 서비스
 *
 * Redis를 사용하여 중복 웹훅 이벤트 차단
 */
@Injectable()
export class WebhookReplayPreventionService {
  // 웹훅 이벤트 ID 캐시 TTL (5분)
  private readonly WEBHOOK_EVENT_TTL = 300; // 5분

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: CustomLoggerService
  ) {}

  /**
   * 웹훅 이벤트가 이미 처리되었는지 확인
   *
   * @param eventId - 웹훅 이벤트 고유 ID (LINE message ID, Kakao user_key + timestamp 등)
   * @param platform - 플랫폼 (KAKAO, LINE)
   * @returns true면 중복 (차단), false면 신규 (처리)
   */
  async isDuplicate(eventId: string, platform: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(eventId, platform);

    // Redis에서 이벤트 ID 조회
    const exists = await this.cacheService.get<boolean>(cacheKey);

    if (exists) {
      this.logger.warn(`Duplicate webhook event detected`, 'WebhookReplayPrevention', {
        eventId,
        platform,
      });
      return true;
    }

    // 신규 이벤트 - Redis에 저장 (5분간 유지)
    await this.cacheService.set(cacheKey, true, this.WEBHOOK_EVENT_TTL);
    return false;
  }

  /**
   * 타임스탬프 검증 (Replay Attack 방지)
   *
   * @param timestamp - 웹훅 이벤트 타임스탬프 (Unix timestamp, milliseconds)
   * @param maxAgeSeconds - 허용 가능한 최대 시간 차이 (기본 5분)
   * @returns true면 유효, false면 너무 오래됨
   */
  isTimestampValid(timestamp: number, maxAgeSeconds = 300): boolean {
    const now = Date.now();
    const diff = Math.abs(now - timestamp);

    const isValid = diff < maxAgeSeconds * 1000;

    if (!isValid) {
      this.logger.warn(`Webhook timestamp too old or in future`, 'WebhookReplayPrevention', {
        timestamp,
        now,
        diffSeconds: Math.floor(diff / 1000),
        maxAgeSeconds,
      });
    }

    return isValid;
  }

  /**
   * 캐시 키 생성
   */
  private getCacheKey(eventId: string, platform: string): string {
    return this.cacheService.generateKey('webhook_event', platform, eventId);
  }

  /**
   * 웹훅 이벤트 ID 수동 삭제 (테스트용)
   */
  async removeEvent(eventId: string, platform: string): Promise<void> {
    const cacheKey = this.getCacheKey(eventId, platform);
    await this.cacheService.del(cacheKey);
    this.logger.log(`Webhook event removed from cache: ${eventId}`, 'WebhookReplayPrevention');
  }
}
