/**
 * Kakao User Journey E2E Tests
 *
 * 테스트 범위:
 * - 사용자가 Kakao로 문의 → 웹훅 수신 → 문의 생성 → AI 분석 큐 추가 → 문의 조회
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

describe('Kakao User Journey E2E', () => {
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

  describe('Complete Kakao User Journey', () => {
    let testUser: { id: string; email: string };
    let testBusiness: { id: string; name: string };
    let testChannel: { id: string; name: string; platform: string };
    let testCustomer: { id: string; platform_user_id: string };
    let accessToken: string;

    beforeAll(async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      // 1. 사용자 생성 및 로그인
      testUser = await createTestUser(prisma);
      testData.userIds.push(testUser.id);

      // 회원가입 (실제로는 이미 생성되었지만 로그인 테스트)
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

      // 3. Kakao 채널 생성
      testChannel = await createTestChannel(prisma, testBusiness.id, 'KAKAO');
      testData.channelIds.push(testChannel.id);

      // 4. 고객 생성
      testCustomer = await createTestCustomer(prisma, testBusiness.id, 'KAKAO');
      testData.customerIds.push(testCustomer.id);
    });

    it('should receive Kakao webhook and create inquiry', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Kakao 웹훅 페이로드
      const kakaoWebhookPayload = {
        user: {
          id: testCustomer.platform_user_id,
          type: 'user',
          properties: {
            nickname: 'Test User',
          },
        },
        type: 'text',
        content: {
          text: '안녕하세요, 문의드립니다.',
        },
        user_key: testCustomer.platform_user_id,
      };

      // 웹훅 수신 (개발 환경에서는 IP 화이트리스트 체크가 스킵됨)
      const webhookResponse = await request(app.getHttpServer())
        .post(`/webhooks/kakao/${testChannel.id}`)
        .send(kakaoWebhookPayload)
        .expect(200);

      expect(webhookResponse.body.success).toBe(true);
      expect(webhookResponse.body.inquiry_id).toBeDefined();
      expect(webhookResponse.body.customer_id).toBe(testCustomer.id);

      testData.inquiryIds.push(webhookResponse.body.inquiry_id);
    });

    it('should retrieve inquiry list after webhook', async () => {
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
      expect(inquiriesResponse.body.data.length).toBeGreaterThan(0);

      // 생성된 문의 확인
      const inquiry = inquiriesResponse.body.data.find((inq: { id: string }) =>
        testData.inquiryIds.includes(inq.id)
      );
      expect(inquiry).toBeDefined();
      expect(inquiry.message_text).toContain('안녕하세요');
    });

    it('should retrieve inquiry details', async () => {
      if (!isDatabaseAvailable || testData.inquiryIds.length === 0) {
        console.log('Skipping test: Database not available or no inquiries');
        return;
      }

      const inquiryId = testData.inquiryIds[0];

      // 문의 상세 조회
      const inquiryResponse = await request(app.getHttpServer())
        .get(`/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(inquiryResponse.body.success).toBe(true);
      expect(inquiryResponse.body.data.id).toBe(inquiryId);
      expect(inquiryResponse.body.data.message_text).toBeDefined();
      expect(inquiryResponse.body.data.customer).toBeDefined();
      expect(inquiryResponse.body.data.channel).toBeDefined();
    });

    it('should update inquiry status', async () => {
      if (!isDatabaseAvailable || testData.inquiryIds.length === 0) {
        console.log('Skipping test: Database not available or no inquiries');
        return;
      }

      const inquiryId = testData.inquiryIds[0];

      // 문의 상태 업데이트
      const updateResponse = await request(app.getHttpServer())
        .patch(`/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'IN_PROGRESS',
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.status).toBe('IN_PROGRESS');
    });

    it('should trigger AI analysis for inquiry', async () => {
      if (!isDatabaseAvailable || testData.inquiryIds.length === 0) {
        console.log('Skipping test: Database not available or no inquiries');
        return;
      }

      const inquiryId = testData.inquiryIds[0];

      // AI 분석 실행 (큐에 추가됨)
      const analyzeResponse = await request(app.getHttpServer())
        .post(`/inquiries/${inquiryId}/analyze`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(analyzeResponse.body.success).toBe(true);
      // AI 분석은 비동기로 처리되므로 큐에 추가되었다는 응답만 확인
    });

    it('should handle multiple Kakao messages from same customer', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 두 번째 메시지
      const secondMessage = {
        user: {
          id: testCustomer.platform_user_id,
          type: 'user',
          properties: {
            nickname: 'Test User',
          },
        },
        type: 'text',
        content: {
          text: '추가 문의사항이 있습니다.',
        },
        user_key: testCustomer.platform_user_id,
      };

      const webhookResponse = await request(app.getHttpServer())
        .post(`/webhooks/kakao/${testChannel.id}`)
        .send(secondMessage)
        .expect(200);

      expect(webhookResponse.body.success).toBe(true);
      expect(webhookResponse.body.inquiry_id).toBeDefined();

      testData.inquiryIds.push(webhookResponse.body.inquiry_id);

      // 고객의 inquiry_count가 증가했는지 확인
      const customer = await prisma.read.customer.findUnique({
        where: { id: testCustomer.id },
      });

      expect(customer?.inquiry_count).toBeGreaterThan(0);
    });

    it('should filter inquiries by status', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // IN_PROGRESS 상태의 문의만 조회
      const filteredResponse = await request(app.getHttpServer())
        .get('/inquiries')
        .query({
          business_id: testBusiness.id,
          status: 'IN_PROGRESS',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(filteredResponse.body.success).toBe(true);
      expect(Array.isArray(filteredResponse.body.data)).toBe(true);

      // 모든 문의가 IN_PROGRESS 상태인지 확인
      filteredResponse.body.data.forEach((inquiry: { status: string }) => {
        expect(inquiry.status).toBe('IN_PROGRESS');
      });
    });

    it('should search inquiries by text', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 검색어로 문의 조회
      const searchResponse = await request(app.getHttpServer())
        .get('/inquiries')
        .query({
          business_id: testBusiness.id,
          search: '안녕하세요',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(Array.isArray(searchResponse.body.data)).toBe(true);

      // 검색 결과에 '안녕하세요'가 포함된 문의가 있는지 확인
      const hasMatchingInquiry = searchResponse.body.data.some(
        (inquiry: { message_text: string }) => inquiry.message_text.includes('안녕하세요')
      );
      expect(hasMatchingInquiry).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should reject webhook for non-existent channel', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const invalidChannelId = 'non-existent-channel-id';
      const webhookPayload = {
        user: {
          id: 'test-user',
          type: 'user',
        },
        type: 'text',
        content: {
          text: 'Test message',
        },
      };

      await request(app.getHttpServer())
        .post(`/webhooks/kakao/${invalidChannelId}`)
        .send(webhookPayload)
        .expect(404);
    });

    it('should reject webhook with invalid message type', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 채널 생성
      const testUser = await createTestUser(prisma);
      testData.userIds.push(testUser.id);
      const testBusiness = await createTestBusiness(prisma, testUser.id);
      testData.businessIds.push(testBusiness.id);
      const testChannel = await createTestChannel(prisma, testBusiness.id, 'KAKAO');
      testData.channelIds.push(testChannel.id);

      const invalidWebhookPayload = {
        user: {
          id: 'test-user',
          type: 'user',
        },
        type: 'unsupported_type', // 지원하지 않는 타입
        content: {},
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/kakao/${testChannel.id}`)
        .send(invalidWebhookPayload)
        .expect(200); // 서비스에서 성공으로 처리하지만 메시지는 처리하지 않음

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('not supported');
    });
  });
});
