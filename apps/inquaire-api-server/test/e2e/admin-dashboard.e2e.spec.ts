/**
 * Admin Dashboard E2E Tests
 *
 * 테스트 범위:
 * - 관리자 로그인 → 문의 목록 조회 → 상세 조회 → 수동 답변 → 상태 업데이트
 * - 전체 관리자 대시보드 플로우
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

describe('Admin Dashboard E2E', () => {
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

  describe('Admin Login and Dashboard Access', () => {
    let adminUser: { id: string; email: string };
    let adminToken: string;
    let testBusiness: { id: string; name: string };

    beforeAll(async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      // 관리자 사용자 생성
      adminUser = await createTestUser(prisma, `admin-${Date.now()}@example.com`);
      testData.userIds.push(adminUser.id);

      // 관리자 역할로 업데이트
      await prisma.write.user.updateMany({
        where: { id: adminUser.id },
        data: { role: 'ADMIN' },
      });

      // 로그인
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      adminToken = loginResponse.body.data.access_token;

      // 비즈니스 생성
      testBusiness = await createTestBusiness(prisma, adminUser.id);
      testData.businessIds.push(testBusiness.id);
    });

    it('should allow admin to login and get access token', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      expect(adminToken).toBeDefined();
      expect(typeof adminToken).toBe('string');
    });

    it('should retrieve admin profile', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.id).toBe(adminUser.id);
      expect(profileResponse.body.data.email).toBe(adminUser.email);
      expect(profileResponse.body.data.role).toBe('ADMIN');
    });

    it('should retrieve empty inquiry list initially', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const inquiriesResponse = await request(app.getHttpServer())
        .get('/inquiries')
        .query({ business_id: testBusiness.id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(inquiriesResponse.body.success).toBe(true);
      expect(inquiriesResponse.body.data).toBeDefined();
      expect(Array.isArray(inquiriesResponse.body.data)).toBe(true);
      expect(inquiriesResponse.body.meta).toBeDefined();
    });

    it('should create inquiry and retrieve it', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 채널 및 고객 생성
      const testChannel = await createTestChannel(prisma, testBusiness.id, 'KAKAO');
      testData.channelIds.push(testChannel.id);
      const testCustomer = await createTestCustomer(prisma, testBusiness.id, 'KAKAO');
      testData.customerIds.push(testCustomer.id);

      // 문의 생성
      const createResponse = await request(app.getHttpServer())
        .post('/inquiries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          business_id: testBusiness.id,
          channel_id: testChannel.id,
          customer_id: testCustomer.id,
          message_text: '관리자가 생성한 테스트 문의입니다.',
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.id).toBeDefined();
      testData.inquiryIds.push(createResponse.body.data.id);

      // 생성된 문의 조회
      const inquiryResponse = await request(app.getHttpServer())
        .get(`/inquiries/${createResponse.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(inquiryResponse.body.success).toBe(true);
      expect(inquiryResponse.body.data.message_text).toContain('관리자가 생성한');
    });

    it('should update inquiry status and add manual response', async () => {
      if (!isDatabaseAvailable || testData.inquiryIds.length === 0) {
        console.log('Skipping test: Database not available or no inquiries');
        return;
      }

      const inquiryId = testData.inquiryIds[0];

      // 문의 업데이트
      const updateResponse = await request(app.getHttpServer())
        .patch(`/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'IN_PROGRESS',
          reply_text: '관리자가 수동으로 작성한 답변입니다.',
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.status).toBe('IN_PROGRESS');
      expect(updateResponse.body.data.reply_text).toContain('관리자가 수동으로');
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
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(filteredResponse.body.success).toBe(true);
      expect(Array.isArray(filteredResponse.body.data)).toBe(true);
    });

    it('should paginate inquiry list', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 페이지네이션 테스트
      const page1Response = await request(app.getHttpServer())
        .get('/inquiries')
        .query({
          business_id: testBusiness.id,
          page: 1,
          limit: 10,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(page1Response.body.success).toBe(true);
      expect(page1Response.body.meta).toBeDefined();
      expect(page1Response.body.meta.page).toBe(1);
      expect(page1Response.body.meta.limit).toBe(10);
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
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data).toBeDefined();
      expect(statsResponse.body.data.business_id).toBe(testBusiness.id);
    });

    it('should complete inquiry and mark as COMPLETED', async () => {
      if (!isDatabaseAvailable || testData.inquiryIds.length === 0) {
        console.log('Skipping test: Database not available or no inquiries');
        return;
      }

      const inquiryId = testData.inquiryIds[0];

      // 문의 완료 처리
      const completeResponse = await request(app.getHttpServer())
        .patch(`/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'COMPLETED',
          reply_text: '최종 답변이 완료되었습니다.',
        })
        .expect(200);

      expect(completeResponse.body.success).toBe(true);
      expect(completeResponse.body.data.status).toBe('COMPLETED');
    });

    it('should delete inquiry', async () => {
      if (!isDatabaseAvailable || testData.inquiryIds.length === 0) {
        console.log('Skipping test: Database not available or no inquiries');
        return;
      }

      const inquiryId = testData.inquiryIds[testData.inquiryIds.length - 1];

      // 문의 삭제
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // 삭제된 문의는 조회되지 않아야 함
      await request(app.getHttpServer())
        .get(`/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Multiple Business Management', () => {
    let adminUser: { id: string; email: string };
    let adminToken: string;
    let business1: { id: string; name: string };
    let business2: { id: string; name: string };

    beforeAll(async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      // 관리자 생성
      adminUser = await createTestUser(prisma, `admin-multi-${Date.now()}@example.com`);
      testData.userIds.push(adminUser.id);

      await prisma.write.user.updateMany({
        where: { id: adminUser.id },
        data: { role: 'ADMIN' },
      });

      // 로그인
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      adminToken = loginResponse.body.data.access_token;

      // 여러 비즈니스 생성
      business1 = await createTestBusiness(prisma, adminUser.id, 'Business 1');
      business2 = await createTestBusiness(prisma, adminUser.id, 'Business 2');
      testData.businessIds.push(business1.id, business2.id);
    });

    it('should filter inquiries by business', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Business 1의 문의만 조회
      const business1Response = await request(app.getHttpServer())
        .get('/inquiries')
        .query({ business_id: business1.id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(business1Response.body.success).toBe(true);
      expect(Array.isArray(business1Response.body.data)).toBe(true);

      // 모든 문의가 business1에 속하는지 확인
      business1Response.body.data.forEach((inquiry: { business_id: string }) => {
        expect(inquiry.business_id).toBe(business1.id);
      });
    });
  });
});
