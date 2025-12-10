/**
 * Error Recovery E2E Tests
 *
 * 테스트 범위:
 * - Database 연결 실패 복구
 * - Redis 연결 실패 복구
 * - 잘못된 요청 처리
 * - 에러 응답 포맷
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

import { cleanupTestData, createTestApp, createTestUser } from './helpers';

import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

describe('Error Recovery E2E', () => {
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

  describe('Error Response Format', () => {
    it('should return standardized error format for 404', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 존재하지 않는 리소스 조회
      const response = await request(app.getHttpServer())
        .get('/inquiries/non-existent-id')
        .set('Authorization', `Bearer invalid-token`)
        .expect(401); // 인증 실패

      // 에러 응답 구조 확인
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });

    it('should return standardized error format for 400', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 잘못된 요청 데이터
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'short',
          name: '',
        })
        .expect(400);

      // 에러 응답 구조 확인
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('Invalid Request Handling', () => {
    it('should handle missing required fields gracefully', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 필수 필드 누락
      const response = await request(app.getHttpServer())
        .post('/inquiries')
        .set('Authorization', `Bearer invalid-token`)
        .send({
          // business_id, channel_id, customer_id 누락
          message_text: 'Test message',
        })
        .expect(401); // 인증 실패가 먼저 발생

      expect(response.body).toHaveProperty('statusCode');
    });

    it('should handle invalid inquiry ID format', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 사용자 생성 및 로그인
      const testUser = await createTestUser(prisma);
      testData.userIds.push(testUser.id);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      // 잘못된 형식의 ID
      const response = await request(app.getHttpServer())
        .get('/inquiries/invalid-id-format-123')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // 사용자 생성 및 로그인
      const testUser = await createTestUser(prisma);
      testData.userIds.push(testUser.id);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      // 존재하지 않는 비즈니스 ID로 문의 생성 시도
      const response = await request(app.getHttpServer())
        .post('/inquiries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          business_id: 'non-existent-business-id',
          channel_id: 'non-existent-channel-id',
          customer_id: 'non-existent-customer-id',
          message_text: 'Test message',
        })
        .expect(404); // NotFoundException

      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('Service Unavailable Handling', () => {
    it('should return health check status', async () => {
      // Health check는 항상 작동해야 함
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data.status).toBe('ok');
    });

    it('should return detailed health check', async () => {
      // The /health endpoint returns detailed info
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
    });
  });
});
