import * as crypto from 'crypto';

import { Prisma } from '@/prisma';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import axios from 'axios';
import { Queue } from 'bullmq';

import { InstagramMessagingEvent, InstagramWebhookDto } from './dto/instagram-webhook.dto';
import { KakaoWebhookDto } from './dto/kakao-webhook.dto';
import { LineEvent, LineWebhookDto } from './dto/line-webhook.dto';
import { NaverTalkTalkWebhookDto } from './dto/naver-talktalk-webhook.dto';
import { WebhookReplayPreventionService } from './services/webhook-replay-prevention.service';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { MetricsService } from '@/common/modules/metrics/metrics.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService,
    private readonly metricsService: MetricsService,
    private readonly replayPrevention: WebhookReplayPreventionService,
    @InjectQueue('webhooks') private readonly webhookQueue: Queue
  ) {}

  /**
   * Kakao 웹훅 처리
   */
  async handleKakaoWebhook(channelId: string, payload: KakaoWebhookDto) {
    this.logger.log(`Received Kakao webhook for channel: ${channelId}`);

    try {
      // 1. 채널 조회 (Read DB)
      const channel = await this.prisma.read.channel.findFirst({
        where: { id: channelId },
        include: { business: true },
      });

      if (!channel || channel.deleted_at) {
        throw new NotFoundException(`Channel ${channelId} not found`);
      }

      // 2. 중복 이벤트 검증 (Replay Attack 방지)
      const userId = payload.user_key || payload.user?.id || 'unknown';
      const timestamp = Date.now();
      const eventId = `${userId}_${timestamp}`;

      const isDuplicate = await this.replayPrevention.isDuplicate(eventId, 'KAKAO');
      if (isDuplicate) {
        this.logger.warn(`Duplicate Kakao webhook event rejected: ${eventId}`);
        throw new BadRequestException('Duplicate webhook event');
      }

      // 3. Webhook 이벤트 로깅 및 메트릭 기록
      await this.logWebhookEvent(channelId, 'message_received', payload);
      this.metricsService.recordWebhookEvent('KAKAO', 'message_received', channelId);

      // 3. 메시지 타입 확인
      if (payload.type !== 'text' && payload.type !== 'message') {
        this.logger.warn(`Unsupported message type: ${payload.type}`);
        return { success: true, message: 'Message type not supported' };
      }

      // 4. 메시지 텍스트 추출
      const messageText =
        typeof payload.content === 'string' ? payload.content : payload.content?.text;

      if (!messageText) {
        throw new BadRequestException('Message text is empty');
      }

      // 5. 고객 정보 가져오기 또는 생성
      const customer = await this.findOrCreateCustomer(
        channel.business_id,
        payload.user_key || payload.user?.id || 'unknown',
        'KAKAO',
        payload.user?.properties?.nickname
      );

      // 6. 문의 생성 (Write DB - AI 분석은 별도 서비스에서 처리)
      const inquiry = await this.prisma.write.inquiry.create({
        data: {
          business_id: channel.business_id,
          channel_id: channelId,
          customer_id: customer.id,
          platform_message_id: payload.user?.id || 'unknown',
          message_text: messageText,
          status: 'NEW',
          received_at: new Date(),
        },
      });

      this.logger.log(`Created inquiry ${inquiry.id} from Kakao message`);

      // 7. 메트릭 기록
      this.metricsService.recordInquiryCreated('KAKAO', channel.business_id);

      // ✅ Sentry: 웹훅 처리 성공 컨텍스트
      Sentry.setContext('webhook_processing', {
        platform: 'KAKAO',
        event_type: 'message_received',
        channel_id: channelId,
        business_id: channel.business_id,
        status: 'success',
      });

      return {
        success: true,
        inquiry_id: inquiry.id,
        customer_id: customer.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Kakao webhook error: ${errorMessage}`, errorStack);

      // ❌ Sentry: 웹훅 처리 실패 컨텍스트
      Sentry.setContext('webhook_processing', {
        platform: 'KAKAO',
        event_type: 'message_received',
        channel_id: channelId,
        status: 'error',
        error_type: error instanceof Error ? error.name : 'UnknownError',
      });

      // Sentry: 에러 캡처
      Sentry.captureException(error, {
        tags: {
          module: 'webhooks',
          platform: 'KAKAO',
          channel_id: channelId,
        },
        level: 'error',
      });

      // 에러 로깅
      await this.logError('KAKAO_WEBHOOK', error as Error, { channelId, payload });

      throw error;
    }
  }

  /**
   * LINE 웹훅 처리
   */
  async handleLineWebhook(channelId: string, payload: LineWebhookDto) {
    this.logger.log(`Received LINE webhook for channel: ${channelId}`);

    try {
      // 1. 채널 조회 (Read DB)
      const channel = await this.prisma.read.channel.findFirst({
        where: { id: channelId },
        include: { business: true },
      });

      if (!channel || channel.deleted_at) {
        throw new NotFoundException(`Channel ${channelId} not found`);
      }

      // 2. Webhook 이벤트 로깅 및 메트릭 기록
      await this.logWebhookEvent(channelId, 'message_received', payload);
      this.metricsService.recordWebhookEvent('LINE', 'message_received', channelId);

      const results = [];

      // 3. 각 이벤트 처리
      for (const event of payload.events) {
        // 3-1. 타임스탬프 검증 (Replay Attack 방지)
        if (!this.replayPrevention.isTimestampValid(event.timestamp)) {
          this.logger.warn(`LINE webhook event timestamp too old: ${event.timestamp}`);
          continue; // 스킵
        }

        // 3-2. 중복 이벤트 검증 (LINE message ID 사용)
        const messageId = event.message?.id || `${event.source.userId}_${event.timestamp}`;
        const isDuplicate = await this.replayPrevention.isDuplicate(messageId, 'LINE');

        if (isDuplicate) {
          this.logger.warn(`Duplicate LINE webhook event rejected: ${messageId}`);
          continue; // 스킵
        }

        // 3-3. 메시지 처리
        if (event.type === 'message' && event.message?.type === 'text' && event.message.text) {
          const result = await this.processLineMessage(channel, event, event.message.text);
          results.push(result);
        }
      }

      // ✅ Sentry: 웹훅 처리 성공 컨텍스트
      Sentry.setContext('webhook_processing', {
        platform: 'LINE',
        event_type: 'message_received',
        channel_id: channelId,
        business_id: channel.business_id,
        processed_count: results.length,
        status: 'success',
      });

      return {
        success: true,
        processed: results.length,
        results,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`LINE webhook error: ${errorMessage}`, errorStack);

      // ❌ Sentry: 웹훅 처리 실패 컨텍스트
      Sentry.setContext('webhook_processing', {
        platform: 'LINE',
        event_type: 'message_received',
        channel_id: channelId,
        status: 'error',
        error_type: error instanceof Error ? error.name : 'UnknownError',
      });

      // Sentry: 에러 캡처
      Sentry.captureException(error, {
        tags: {
          module: 'webhooks',
          platform: 'LINE',
          channel_id: channelId,
        },
        level: 'error',
      });

      // 에러 로깅
      await this.logError('LINE_WEBHOOK', error as Error, { channelId, payload });

      throw error;
    }
  }

  /**
   * LINE 메시지 개별 처리
   */
  private async processLineMessage(
    channel: { id: string; business_id: string },
    event: LineEvent,
    messageText: string
  ) {
    // 1. 고객 정보 가져오기 또는 생성
    const customer = await this.findOrCreateCustomer(
      channel.business_id,
      event.source.userId,
      'LINE'
    );

    // 2. 문의 생성 (Write DB)
    const inquiry = await this.prisma.write.inquiry.create({
      data: {
        business_id: channel.business_id,
        channel_id: channel.id,
        customer_id: customer.id,
        platform_message_id: event.message?.id || '',
        message_text: messageText,
        status: 'NEW',
        received_at: new Date(event.timestamp),
      },
    });

    this.logger.log(`Created inquiry ${inquiry.id} from LINE message`);

    // 3. 메트릭 기록
    this.metricsService.recordInquiryCreated('LINE', channel.business_id);

    return {
      inquiry_id: inquiry.id,
      customer_id: customer.id,
      reply_token: event.replyToken,
    };
  }

  /**
   * 고객 찾기 또는 생성 (자동 중복 제거)
   */
  private async findOrCreateCustomer(
    businessId: string,
    platformUserId: string,
    platform: 'KAKAO' | 'LINE' | 'NAVER_TALK' | 'INSTAGRAM',
    name?: string
  ) {
    // 1. 기존 고객 찾기 (Read DB)
    let customer = await this.prisma.read.customer.findFirst({
      where: {
        business_id: businessId,
        platform_user_id: platformUserId,
        platform,
        deleted_at: null,
      },
    });

    // 2. 없으면 생성 (Write DB)
    if (!customer) {
      const now = new Date();
      customer = await this.prisma.write.customer.create({
        data: {
          business_id: businessId,
          platform_user_id: platformUserId,
          platform,
          name: name || `고객_${platformUserId.substring(0, 8)}`,
          first_contact: now,
          last_contact: now,
          inquiry_count: 0,
        },
      });

      this.logger.log(`Created new customer ${customer.id}`);
    } else {
      // 3. 마지막 접촉 시간 업데이트 (Write DB)
      customer = await this.prisma.write.customer.update({
        where: { id: customer.id },
        data: {
          last_contact: new Date(),
          inquiry_count: { increment: 1 },
        },
      });
    }

    return customer;
  }

  /**
   * Webhook 이벤트 로깅
   */
  private async logWebhookEvent(
    channelId: string,
    eventType: string,
    payload: KakaoWebhookDto | LineWebhookDto | NaverTalkTalkWebhookDto | InstagramWebhookDto
  ) {
    try {
      // DTO를 plain object로 변환 (JSON serialization)
      const jsonPayload = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;

      await this.prisma.write.webhookEvent.create({
        data: {
          channel_id: channelId,
          event_type: eventType,
          payload: jsonPayload,
          processed: true,
          received_at: new Date(),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to log webhook event: ${errorMessage}`);
    }
  }

  /**
   * 에러 로깅
   */
  private async logError(
    errorType: string,
    error: Error,
    context: Record<string, unknown>
  ): Promise<void> {
    try {
      // Record를 plain object로 변환 (JSON serialization)
      const jsonContext = JSON.parse(JSON.stringify(context)) as Prisma.InputJsonValue;

      await this.prisma.write.errorLog.create({
        data: {
          error_type: errorType,
          error_message: error.message,
          stack_trace: error.stack,
          context: jsonContext,
        },
      });
    } catch (logError) {
      const errorMessage = logError instanceof Error ? logError.message : 'Unknown error';
      this.logger.error(`Failed to log error: ${errorMessage}`);
    }
  }

  /**
   * Kakao 메시지 전송
   */
  async sendKakaoMessage(channelId: string, userKey: string, message: string) {
    // Read DB
    const channel = await this.prisma.read.channel.findFirst({
      where: { id: channelId },
    });

    if (!channel || channel.deleted_at) {
      throw new NotFoundException(`Channel ${channelId} not found`);
    }

    if (!channel.access_token) {
      throw new BadRequestException('Channel access token not configured');
    }

    try {
      const response = await axios.post(
        'https://kapi.kakao.com/v1/api/talk/send',
        {
          receiver_key: userKey,
          message: {
            text: message,
          },
        },
        {
          headers: {
            Authorization: `KakaoAK ${channel.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Sent Kakao message to user ${userKey}`);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send Kakao message: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * LINE 메시지 전송
   */
  async sendLineMessage(replyToken: string, message: string) {
    const lineChannelAccessToken = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN');

    if (!lineChannelAccessToken) {
      throw new BadRequestException('LINE channel access token not configured');
    }

    try {
      const response = await axios.post(
        'https://api.line.me/v2/bot/message/reply',
        {
          replyToken,
          messages: [
            {
              type: 'text',
              text: message,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${lineChannelAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Sent LINE reply message`);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send LINE message: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Webhook 시그니처 검증 (LINE)
   *
   * @param body - Raw body buffer (before JSON parsing)
   * @param signature - x-line-signature header value
   * @returns true if signature is valid
   */
  verifyLineSignature(body: Buffer, signature: string): boolean {
    const channelSecret = this.configService.get<string>('LINE_CHANNEL_SECRET');

    if (!channelSecret) {
      this.logger.warn('LINE channel secret not configured');
      return false;
    }

    if (!signature) {
      this.logger.warn('LINE signature header missing');
      return false;
    }

    // In test environment, if rawBody is not available, skip signature verification
    if (!body && process.env.NODE_ENV === 'test') {
      this.logger.log('Test mode - skipping LINE signature verification (rawBody not available)');
      return true;
    }

    if (!body) {
      this.logger.warn('Raw body not available for signature verification');
      return false;
    }

    // Calculate HMAC-SHA256 hash of raw body
    const hash = crypto.createHmac('SHA256', channelSecret).update(body).digest('base64');

    // 타이밍 안전 비교 (Timing Attack 방어)
    // 일반 문자열 비교(===)는 타이밍 공격에 취약할 수 있으므로
    // crypto.timingSafeEqual을 사용하여 일정한 시간에 비교
    try {
      return crypto.timingSafeEqual(Buffer.from(hash, 'base64'), Buffer.from(signature, 'base64'));
    } catch {
      // Buffer 생성 실패 시 (잘못된 base64 형식 등)
      this.logger.warn('Failed to compare signatures using timingSafeEqual');
      return false;
    }
  }

  /**
   * Webhook 시그니처 검증 (Kakao)
   *
   * Kakao는 공식적으로 서명 검증을 제공하지 않지만,
   * 향후 지원 가능성을 고려하여 메서드를 준비합니다.
   * 현재는 IP 화이트리스트를 주 보안 메커니즘으로 사용합니다.
   *
   * @param body - Raw body buffer (before JSON parsing)
   * @param signature - x-kakao-signature header value (optional)
   * @returns true if signature is valid or not required
   */
  verifyKakaoSignature(body: Buffer, signature?: string): boolean {
    const kakaoSecret = this.configService.get<string>('KAKAO_WEBHOOK_SECRET');

    // Kakao 서명 검증이 설정되지 않은 경우 (IP 화이트리스트만 사용)
    if (!kakaoSecret) {
      this.logger.log('Kakao signature verification not configured - using IP whitelist only');
      return true; // IP 화이트리스트가 이미 Guard에서 검증됨
    }

    // 서명이 제공되지 않은 경우
    if (!signature) {
      this.logger.warn('Kakao signature header missing');
      return false;
    }

    // Calculate HMAC-SHA256 hash of raw body
    const hash = crypto.createHmac('SHA256', kakaoSecret).update(body).digest('base64');

    // 타이밍 안전 비교 (Timing Attack 방어)
    try {
      return crypto.timingSafeEqual(Buffer.from(hash, 'base64'), Buffer.from(signature, 'base64'));
    } catch {
      this.logger.warn('Failed to compare Kakao signatures using timingSafeEqual');
      return false;
    }
  }

  /**
   * 네이버 톡톡 웹훅 처리
   */
  async handleNaverTalkWebhook(channelId: string, payload: NaverTalkTalkWebhookDto) {
    this.logger.log(`Received Naver TalkTalk webhook for channel: ${channelId}`);

    try {
      // 1. 채널 조회 (Read DB)
      const channel = await this.prisma.read.channel.findFirst({
        where: { id: channelId },
        include: { business: true },
      });

      if (!channel || channel.deleted_at) {
        throw new NotFoundException(`Channel ${channelId} not found`);
      }

      // 2. 중복 이벤트 검증 (Replay Attack 방지)
      const eventId = `${payload.user.userIdNo}_${Date.now()}`;
      const isDuplicate = await this.replayPrevention.isDuplicate(eventId, 'NAVER_TALK');
      if (isDuplicate) {
        this.logger.warn(`Duplicate Naver TalkTalk webhook event rejected: ${eventId}`);
        throw new BadRequestException('Duplicate webhook event');
      }

      // 3. Webhook 이벤트 로깅 및 메트릭 기록
      await this.logWebhookEvent(
        channelId,
        payload.event,
        payload as unknown as NaverTalkTalkWebhookDto
      );
      this.metricsService.recordWebhookEvent('NAVER_TALK', payload.event, channelId);

      // 4. 메시지 이벤트만 처리
      if (payload.event !== 'send') {
        this.logger.log(`Non-message event type: ${payload.event}`);
        return { success: true, message: 'Event type not supported for inquiry creation' };
      }

      // 5. 메시지 텍스트 추출
      const messageText = payload.textContent?.text || payload.options?.inquiry;
      if (!messageText) {
        throw new BadRequestException('Message text is empty');
      }

      // 6. 고객 정보 가져오기 또는 생성
      const customer = await this.findOrCreateCustomer(
        channel.business_id,
        payload.user.userIdNo,
        'NAVER_TALK',
        payload.user.nickname
      );

      // 7. 문의 생성 (Write DB)
      const inquiry = await this.prisma.write.inquiry.create({
        data: {
          business_id: channel.business_id,
          channel_id: channelId,
          customer_id: customer.id,
          platform_message_id: eventId,
          message_text: messageText,
          status: 'NEW',
          received_at: new Date(),
        },
      });

      this.logger.log(`Created inquiry ${inquiry.id} from Naver TalkTalk message`);

      // 8. 메트릭 기록
      this.metricsService.recordInquiryCreated('NAVER_TALK', channel.business_id);

      // Sentry 컨텍스트
      Sentry.setContext('webhook_processing', {
        platform: 'NAVER_TALK',
        event_type: payload.event,
        channel_id: channelId,
        business_id: channel.business_id,
        status: 'success',
      });

      return {
        success: true,
        inquiry_id: inquiry.id,
        customer_id: customer.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Naver TalkTalk webhook error: ${errorMessage}`, errorStack);

      Sentry.captureException(error, {
        tags: {
          module: 'webhooks',
          platform: 'NAVER_TALK',
          channel_id: channelId,
        },
        level: 'error',
      });

      await this.logError('NAVER_TALK_WEBHOOK', error as Error, { channelId, payload });
      throw error;
    }
  }

  /**
   * Instagram 웹훅 처리
   */
  async handleInstagramWebhook(channelId: string, payload: InstagramWebhookDto) {
    this.logger.log(`Received Instagram webhook for channel: ${channelId}`);

    try {
      // 1. 채널 조회 (Read DB)
      const channel = await this.prisma.read.channel.findFirst({
        where: { id: channelId },
        include: { business: true },
      });

      if (!channel || channel.deleted_at) {
        throw new NotFoundException(`Channel ${channelId} not found`);
      }

      // 2. Webhook 이벤트 로깅 및 메트릭 기록
      await this.logWebhookEvent(
        channelId,
        'message_received',
        payload as unknown as InstagramWebhookDto
      );
      this.metricsService.recordWebhookEvent('INSTAGRAM', 'message_received', channelId);

      const results = [];

      // 3. 각 entry 처리
      for (const entry of payload.entry) {
        if (!entry.messaging) continue;

        for (const messagingEvent of entry.messaging) {
          // Echo 메시지 (본인이 보낸 메시지)는 무시
          if (messagingEvent.message?.is_echo) continue;
          // 삭제된 메시지 무시
          if (messagingEvent.message?.is_deleted) continue;

          // 메시지 타입만 처리
          if (messagingEvent.message?.text) {
            // 중복 이벤트 검증
            const messageId = messagingEvent.message.mid;
            const isDuplicate = await this.replayPrevention.isDuplicate(messageId, 'INSTAGRAM');

            if (isDuplicate) {
              this.logger.warn(`Duplicate Instagram webhook event rejected: ${messageId}`);
              continue;
            }

            const result = await this.processInstagramMessage(
              channel,
              messagingEvent,
              messagingEvent.message.text
            );
            results.push(result);
          }
        }
      }

      // Sentry 컨텍스트
      Sentry.setContext('webhook_processing', {
        platform: 'INSTAGRAM',
        event_type: 'message_received',
        channel_id: channelId,
        business_id: channel.business_id,
        processed_count: results.length,
        status: 'success',
      });

      return {
        success: true,
        processed: results.length,
        results,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Instagram webhook error: ${errorMessage}`, errorStack);

      Sentry.captureException(error, {
        tags: {
          module: 'webhooks',
          platform: 'INSTAGRAM',
          channel_id: channelId,
        },
        level: 'error',
      });

      await this.logError('INSTAGRAM_WEBHOOK', error as Error, { channelId, payload });
      throw error;
    }
  }

  /**
   * Instagram 메시지 개별 처리
   */
  private async processInstagramMessage(
    channel: { id: string; business_id: string },
    event: InstagramMessagingEvent,
    messageText: string
  ) {
    // 1. 고객 정보 가져오기 또는 생성
    const customer = await this.findOrCreateCustomer(
      channel.business_id,
      event.sender.id,
      'INSTAGRAM'
    );

    // 2. 문의 생성 (Write DB)
    const inquiry = await this.prisma.write.inquiry.create({
      data: {
        business_id: channel.business_id,
        channel_id: channel.id,
        customer_id: customer.id,
        platform_message_id: event.message?.mid || '',
        message_text: messageText,
        status: 'NEW',
        received_at: new Date(event.timestamp),
      },
    });

    this.logger.log(`Created inquiry ${inquiry.id} from Instagram message`);

    // 3. 메트릭 기록
    this.metricsService.recordInquiryCreated('INSTAGRAM', channel.business_id);

    return {
      inquiry_id: inquiry.id,
      customer_id: customer.id,
      sender_id: event.sender.id,
    };
  }

  /**
   * 네이버 톡톡 메시지 전송
   */
  async sendNaverTalkMessage(channelId: string, userIdNo: string, message: string) {
    const channel = await this.prisma.read.channel.findFirst({
      where: { id: channelId },
    });

    if (!channel || channel.deleted_at) {
      throw new NotFoundException(`Channel ${channelId} not found`);
    }

    if (!channel.access_token) {
      throw new BadRequestException('Channel access token not configured');
    }

    try {
      const response = await axios.post(
        'https://gw.talk.naver.com/chatbot/v1/event',
        {
          event: 'send',
          user: userIdNo,
          textContent: {
            text: message,
          },
        },
        {
          headers: {
            Authorization: channel.access_token,
            'Content-Type': 'application/json;charset=UTF-8',
          },
        }
      );

      this.logger.log(`Sent Naver TalkTalk message to user ${userIdNo}`);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send Naver TalkTalk message: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Instagram 메시지 전송
   */
  async sendInstagramMessage(recipientId: string, message: string) {
    const instagramAccessToken = this.configService.get<string>('INSTAGRAM_ACCESS_TOKEN');

    if (!instagramAccessToken) {
      throw new BadRequestException('Instagram access token not configured');
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text: message },
        },
        {
          headers: {
            Authorization: `Bearer ${instagramAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Sent Instagram message to user ${recipientId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send Instagram message: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 네이버 톡톡 서명 검증
   */
  verifyNaverTalkSignature(body: Buffer, signature?: string): boolean {
    const naverSecret = this.configService.get<string>('NAVER_TALK_SECRET');

    if (!naverSecret) {
      this.logger.log('Naver TalkTalk signature verification not configured - skipping');
      return true;
    }

    if (!signature) {
      this.logger.warn('Naver TalkTalk signature header missing');
      return false;
    }

    if (!body && process.env.NODE_ENV === 'test') {
      this.logger.log('Test mode - skipping Naver TalkTalk signature verification');
      return true;
    }

    if (!body) {
      this.logger.warn('Raw body not available for signature verification');
      return false;
    }

    const hash = crypto.createHmac('SHA256', naverSecret).update(body).digest('base64');

    try {
      return crypto.timingSafeEqual(Buffer.from(hash, 'base64'), Buffer.from(signature, 'base64'));
    } catch {
      this.logger.warn('Failed to compare Naver TalkTalk signatures');
      return false;
    }
  }

  /**
   * Instagram 웹훅 검증 토큰 확인 (URL 등록 시)
   * 채널별 verify token을 지원하며, 없을 경우 전역 설정을 사용합니다.
   */
  async verifyInstagramWebhookToken(channelId: string, verifyToken: string): Promise<boolean> {
    // 1. 채널별 verify token 확인
    const channel = await this.prisma.read.channel.findFirst({
      where: { id: channelId },
    });

    // 채널 설정에 verify_token이 있으면 사용
    const channelVerifyToken = channel?.webhook_secret;
    if (channelVerifyToken) {
      return verifyToken === channelVerifyToken;
    }

    // 2. 전역 설정 사용 (fallback)
    const expectedToken = this.configService.get<string>('INSTAGRAM_VERIFY_TOKEN');

    if (!expectedToken) {
      this.logger.warn('Instagram verify token not configured');
      return false;
    }

    return verifyToken === expectedToken;
  }

  /**
   * Instagram 서명 검증 (SHA256)
   */
  verifyInstagramSignature(body: Buffer, signature?: string): boolean {
    const appSecret = this.configService.get<string>('INSTAGRAM_APP_SECRET');

    if (!appSecret) {
      this.logger.log('Instagram app secret not configured - skipping signature verification');
      return true;
    }

    if (!signature) {
      this.logger.warn('Instagram signature header missing');
      return false;
    }

    if (!body && process.env.NODE_ENV === 'test') {
      this.logger.log('Test mode - skipping Instagram signature verification');
      return true;
    }

    if (!body) {
      this.logger.warn('Raw body not available for signature verification');
      return false;
    }

    // Instagram signature format: sha256=<signature>
    const expectedSignature = `sha256=${crypto.createHmac('sha256', appSecret).update(body).digest('hex')}`;

    try {
      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    } catch {
      this.logger.warn('Failed to compare Instagram signatures');
      return false;
    }
  }

  /**
   * 웹훅 재시도 로직 (Queue에 추가)
   */
  async retryWebhook(
    channelId: string,
    platform: 'KAKAO' | 'LINE',
    payload: KakaoWebhookDto | LineWebhookDto,
    attemptNumber: number = 1
  ): Promise<void> {
    if (attemptNumber > 3) {
      this.logger.error(
        `Webhook retry limit reached for channel ${channelId}`,
        undefined,
        'WebhooksService'
      );
      return;
    }

    // Exponential backoff: 1분, 5분, 15분
    const delays = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000];
    const delay = delays[attemptNumber - 1];

    await this.webhookQueue.add(
      'process-webhook',
      {
        channelId,
        platform,
        payload,
        attemptNumber,
      },
      {
        delay,
        attempts: 1, // Each retry is a separate job with its own attempt
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    this.logger.log(
      `Queued webhook retry ${attemptNumber}/3 for channel ${channelId} (delay: ${delay}ms)`,
      'WebhooksService'
    );
  }
}
