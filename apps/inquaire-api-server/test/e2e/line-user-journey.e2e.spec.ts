/**
 * LINE User Journey E2E Tests
 *
 * 테스트 범위:
 * - 사용자가 LINE으로 문의 → 웹훅 수신 → 문의 생성 → AI 분석 큐 추가 → 문의 조회
 * - 전체 사용자 여정 시나리오
 */

import 'reflect-metadata';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn((password: string) => Promise.resolve(`hashed-${password}`)),
  compare: jest.fn((password: string, hash: string) => {
    const originalPassword = hash.replace('hashed-', '');
    return Promise.resolve(password === originalPassword);
  }),
}));

import * as crypto from 'crypto';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import {
    cleanupTestData,
    createTestApp,
    createTestBusiness,
    createTestChannel,
    createTestCustomer,
    createTestUser,
} from './helpers';

import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

describe('LINE User Journey E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let isDatabaseAvailable = false;

  // Test data IDs for cleanup
  const testData = {
    userIds: [] as string[],
    businessIds: [] as string[],
    channelIds: [] as string[],
    customerIds: [] as string[],
    inquiryIds: [] as string[],
  };

  /**
   * LINE 웹훅 서명 생성 (테스트용)
   */
  function generateLineSignature(channelSecret: string, body: string): string {
    return crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get<PrismaService>(PrismaService);

    // 데이터베이스 연결 확인
    try {
      await prisma.onModuleInit();
      isDatabaseAvailable = true;
    } catch (error) {
      console.warn(
        'Database connection failed, skipping E2E tests. Set TEST_DATABASE_URL to run E2E tests.',
        error
      );
      isDatabaseAvailable = false;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (isDatabaseAvailable && prisma) {
      await cleanupTestData(prisma, testData);
      await prisma.onModuleDestroy();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Complete LINE User Journey', () => {
    let testUser: { id: string; email: string };
    let testBusiness: { id: string; name: string };
    let testChannel: { id: string; name: string; platform: string };
    let testCustomer: { id: string; platform_user_id: string };
    let accessToken: string;
    let channelSecret: string;

    beforeAll(async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      // 1. 사용자 생성 및 로그인
      testUser = await createTestUser(prisma);
      testData.userIds.push(testUser.id);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      accessToken = loginResponse.body.data.access_token;

      // 2. 비즈니스 생성
      testBusiness = await createTestBusiness(prisma, testUser.id);
      testData.businessIds.push(testBusiness.id);

      // 3. LINE 채널 생성
      testChannel = await createTestChannel(prisma, testBusiness.id, 'LINE');
      testData.channelIds.push(testChannel.id);

      // 채널 시크릿 (테스트용)
      channelSecret = 'test-line-channel-secret';

      // 4. 고객 생성
      testCustomer = await createTestCustomer(prisma, testBusiness.id, 'LINE');
      testData.customerIds.push(testCustomer.id);
    });

    it('should receive LINE webhook and create inquiry', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // LINE 웹훅 페이로드
      const lineWebhookPayload = {
        destination: 'test-destination',
        events: [
          {
            type: 'message',
            message: {
              id: `message-${Date.now()}`,
              type: 'text',
              text: '안녕하세요, LINE으로 문의드립니다.',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: testCustomer.platform_user_id,
            },
            replyToken: `reply-token-${Date.now()}`,
            mode: 'active',
          },
        ],
      };

      const bodyString = JSON.stringify(lineWebhookPayload);
      const signature = generateLineSignature(channelSecret, bodyString);

      // 웹훅 수신 (개발 환경에서는 IP 화이트리스트 체크가 스킵됨)
      // Note: 실제 구현에서는 channel_secret을 DB에서 가져와서 검증하지만,
      // 테스트에서는 mock을 사용하거나 실제 검증 로직을 우회해야 할 수 있습니다.
      const webhookResponse = await request(app.getHttpServer())
        .post(`/webhooks/line/${testChannel.id}`)
        .set('x-line-signature', signature)
        .send(lineWebhookPayload)
        .expect(200);

      expect(webhookResponse.body.success).toBe(true);
      expect(webhookResponse.body.processed).toBeGreaterThan(0);
      expect(webhookResponse.body.results).toBeDefined();
      expect(Array.isArray(webhookResponse.body.results)).toBe(true);

      if (webhookResponse.body.results.length > 0) {
        testData.inquiryIds.push(webhookResponse.body.results[0].inquiry_id);
      }
    });

    it('should retrieve inquiry list after LINE webhook', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 문의 목록 조회
      const inquiriesResponse = await request(app.getHttpServer())
        .get('/inquiries')
        .query({ business_id: testBusiness.id })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(inquiriesResponse.body.success).toBe(true);
      expect(inquiriesResponse.body.data).toBeDefined();
      expect(Array.isArray(inquiriesResponse.body.data)).toBe(true);
    });

    it('should handle multiple LINE messages in single webhook', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 여러 메시지를 포함한 LINE 웹훅
      const multiMessageWebhook = {
        destination: 'test-destination',
        events: [
          {
            type: 'message',
            message: {
              id: `message-${Date.now()}-1`,
              type: 'text',
              text: '첫 번째 메시지',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: testCustomer.platform_user_id,
            },
            replyToken: `reply-token-${Date.now()}-1`,
            mode: 'active',
          },
          {
            type: 'message',
            message: {
              id: `message-${Date.now()}-2`,
              type: 'text',
              text: '두 번째 메시지',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: testCustomer.platform_user_id,
            },
            replyToken: `reply-token-${Date.now()}-2`,
            mode: 'active',
          },
        ],
      };

      const bodyString = JSON.stringify(multiMessageWebhook);
      const signature = generateLineSignature(channelSecret, bodyString);

      const webhookResponse = await request(app.getHttpServer())
        .post(`/webhooks/line/${testChannel.id}`)
        .set('x-line-signature', signature)
        .send(multiMessageWebhook)
        .expect(200);

      expect(webhookResponse.body.success).toBe(true);
      expect(webhookResponse.body.processed).toBe(2);
      expect(webhookResponse.body.results.length).toBe(2);

      // 생성된 문의 ID 저장
      webhookResponse.body.results.forEach((result: { inquiry_id: string }) => {
        testData.inquiryIds.push(result.inquiry_id);
      });
    });

    it('should filter inquiries by channel', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 특정 채널의 문의만 조회
      const filteredResponse = await request(app.getHttpServer())
        .get('/inquiries')
        .query({
          business_id: testBusiness.id,
          channel_id: testChannel.id,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(filteredResponse.body.success).toBe(true);
      expect(Array.isArray(filteredResponse.body.data)).toBe(true);

      // 모든 문의가 해당 채널인지 확인
      filteredResponse.body.data.forEach((inquiry: { channel_id: string }) => {
        expect(inquiry.channel_id).toBe(testChannel.id);
      });
    });

    it('should retrieve inquiry statistics', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 통계 조회
      const statsResponse = await request(app.getHttpServer())
        .get('/inquiries/stats')
        .query({
          business_id: testBusiness.id,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data).toBeDefined();
      expect(statsResponse.body.data.business_id).toBe(testBusiness.id);
    });

    it('should update inquiry with manual response', async () => {
      if (!isDatabaseAvailable || testData.inquiryIds.length === 0) {
        console.log('Skipping test: Database not available or no inquiries');
        return;
      }

      const inquiryId = testData.inquiryIds[0];

      // 수동 답변 추가
      const updateResponse = await request(app.getHttpServer())
        .patch(`/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'COMPLETED',
          ai_response: '수동으로 작성한 답변입니다.',
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.status).toBe('COMPLETED');
      expect(updateResponse.body.data.ai_response).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should reject LINE webhook with invalid signature', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 채널 생성
      const testUser = await createTestUser(prisma);
      testData.userIds.push(testUser.id);
      const testBusiness = await createTestBusiness(prisma, testUser.id);
      testData.businessIds.push(testBusiness.id);
      const testChannel = await createTestChannel(prisma, testBusiness.id, 'LINE');
      testData.channelIds.push(testChannel.id);

      const lineWebhookPayload = {
        destination: 'test-destination',
        events: [
          {
            type: 'message',
            message: {
              id: 'test-message-id',
              type: 'text',
              text: 'Test message',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: 'test-user-id',
            },
            replyToken: 'test-reply-token',
            mode: 'active',
          },
        ],
      };

      // 잘못된 서명
      const invalidSignature = 'invalid-signature';

      await request(app.getHttpServer())
        .post(`/webhooks/line/${testChannel.id}`)
        .set('x-line-signature', invalidSignature)
        .send(lineWebhookPayload)
        .expect(400); // BadRequestException
    });

    it('should reject LINE webhook for non-existent channel', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const invalidChannelId = 'non-existent-channel-id';
      const lineWebhookPayload = {
        destination: 'test-destination',
        events: [],
      };

      const bodyString = JSON.stringify(lineWebhookPayload);
      const signature = generateLineSignature('test-secret', bodyString);

      await request(app.getHttpServer())
        .post(`/webhooks/line/${invalidChannelId}`)
        .set('x-line-signature', signature)
        .send(lineWebhookPayload)
        .expect(404);
    });

    it('should skip non-text messages in LINE webhook', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 채널 생성
      const testUser = await createTestUser(prisma);
      testData.userIds.push(testUser.id);
      const testBusiness = await createTestBusiness(prisma, testUser.id);
      testData.businessIds.push(testBusiness.id);
      const testChannel = await createTestChannel(prisma, testBusiness.id, 'LINE');
      testData.channelIds.push(testChannel.id);

      // 이미지 메시지 (텍스트가 아님)
      const imageMessageWebhook = {
        destination: 'test-destination',
        events: [
          {
            type: 'message',
            message: {
              id: 'test-image-message-id',
              type: 'image', // 텍스트가 아닌 타입
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: 'test-user-id',
            },
            replyToken: 'test-reply-token',
            mode: 'active',
          },
        ],
      };

      const bodyString = JSON.stringify(imageMessageWebhook);
      const signature = generateLineSignature('test-secret', bodyString);

      // 이미지 메시지는 처리되지 않지만 웹훅 자체는 성공
      const response = await request(app.getHttpServer())
        .post(`/webhooks/line/${testChannel.id}`)
        .set('x-line-signature', signature)
        .send(imageMessageWebhook)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.processed).toBe(0); // 처리된 메시지 없음
    });
  });
});

