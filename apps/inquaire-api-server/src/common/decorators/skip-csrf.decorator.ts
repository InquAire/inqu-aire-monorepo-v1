import { SetMetadata } from '@nestjs/common';

/**
 * CSRF 검증 스킵 데코레이터
 *
 * 웹훅, 공개 API 등 외부에서 호출되는 엔드포인트에 사용
 *
 * @example
 * ```typescript
 * @SkipCsrf()
 * @Post('webhooks/kakao/:channelId')
 * async handleKakaoWebhook() {
 *   // ...
 * }
 * ```
 */
export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
