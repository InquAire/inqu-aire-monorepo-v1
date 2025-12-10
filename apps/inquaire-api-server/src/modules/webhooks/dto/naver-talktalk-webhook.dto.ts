import { ApiProperty } from '@nestjs/swagger';

/**
 * 네이버 톡톡 사용자 정보
 */
export interface NaverTalkUser {
  userIdNo: string;
  maskingId?: string;
  nickname?: string;
}

/**
 * 네이버 톡톡 텍스트 내용
 */
export interface NaverTalkTextContent {
  text: string;
}

/**
 * 네이버 톡톡 이미지 내용
 */
export interface NaverTalkImageContent {
  imageUrl: string;
}

/**
 * 네이버 톡톡 이벤트
 */
export interface NaverTalkEvent {
  event: 'send' | 'open' | 'leave' | 'friend' | 'profile';
  user: NaverTalkUser;
  textContent?: NaverTalkTextContent;
  imageContent?: NaverTalkImageContent;
  options?: {
    inflow?: string; // 유입 경로
    referer?: string;
    mobile?: boolean;
    inquiry?: string; // 문의 메시지
  };
}

/**
 * 네이버 톡톡 웹훅 DTO
 *
 * @see https://developers.naver.com/docs/talktalk/
 */
export class NaverTalkTalkWebhookDto {
  @ApiProperty({
    description: '네이버 톡톡 계정 ID',
    example: 'partner_account_id',
  })
  partnerId!: string;

  @ApiProperty({
    description: '이벤트 타입',
    enum: ['send', 'open', 'leave', 'friend', 'profile'],
    example: 'send',
  })
  event!: 'send' | 'open' | 'leave' | 'friend' | 'profile';

  @ApiProperty({
    description: '사용자 정보',
  })
  user!: NaverTalkUser;

  @ApiProperty({
    description: '텍스트 메시지 내용',
    required: false,
  })
  textContent?: NaverTalkTextContent;

  @ApiProperty({
    description: '이미지 내용',
    required: false,
  })
  imageContent?: NaverTalkImageContent;

  @ApiProperty({
    description: '추가 옵션',
    required: false,
  })
  options?: {
    inflow?: string;
    referer?: string;
    mobile?: boolean;
    inquiry?: string;
  };
}
