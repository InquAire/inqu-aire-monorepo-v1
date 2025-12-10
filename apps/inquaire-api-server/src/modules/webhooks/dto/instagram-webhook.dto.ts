import { ApiProperty } from '@nestjs/swagger';

/**
 * Instagram 메시지 발신자/수신자
 */
export interface InstagramMessagingParticipant {
  id: string;
}

/**
 * Instagram 메시지 내용
 */
export interface InstagramMessage {
  mid: string; // Message ID
  text?: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'audio' | 'file' | 'share' | 'story_mention';
    payload: {
      url?: string;
      title?: string;
    };
  }>;
  is_echo?: boolean;
  is_deleted?: boolean;
  reply_to?: {
    mid: string;
  };
}

/**
 * Instagram 메시징 이벤트
 */
export interface InstagramMessagingEvent {
  sender: InstagramMessagingParticipant;
  recipient: InstagramMessagingParticipant;
  timestamp: number;
  message?: InstagramMessage;
  postback?: {
    mid: string;
    title: string;
    payload: string;
  };
  reaction?: {
    mid: string;
    action: 'react' | 'unreact';
    reaction?: string;
    emoji?: string;
  };
}

/**
 * Instagram 웹훅 Entry
 */
export interface InstagramEntry {
  id: string; // Instagram Business Account ID
  time: number;
  messaging?: InstagramMessagingEvent[];
  changes?: Array<{
    field: string;
    value: Record<string, unknown>;
  }>;
}

/**
 * Instagram 웹훅 DTO (Meta/Facebook Graph API)
 *
 * @see https://developers.facebook.com/docs/messenger-platform/instagram/get-started
 */
export class InstagramWebhookDto {
  @ApiProperty({
    description: '항상 "instagram"',
    example: 'instagram',
  })
  object!: 'instagram' | 'page';

  @ApiProperty({
    description: '웹훅 이벤트 엔트리 배열',
    type: 'array',
  })
  entry!: InstagramEntry[];
}

/**
 * Instagram 웹훅 검증 쿼리 파라미터
 * (GET 요청 - 웹훅 URL 검증용)
 */
export class InstagramWebhookVerifyDto {
  @ApiProperty({
    description: '구독 모드',
    example: 'subscribe',
  })
  'hub.mode'!: string;

  @ApiProperty({
    description: '검증 토큰',
  })
  'hub.verify_token'!: string;

  @ApiProperty({
    description: 'Meta가 보내는 챌린지 문자열 (이것을 응답으로 반환해야 함)',
  })
  'hub.challenge'!: string;
}
