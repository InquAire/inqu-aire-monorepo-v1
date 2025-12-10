/**
 * E2E 테스트 헬퍼 함수
 */

import { IndustryType } from '@prisma/generated';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/app.module';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

/**
 * E2E 테스트용 앱 인스턴스 생성
 */
export async function createTestApp(): Promise<INestApplication> {
  // 테스트 환경 변수 설정
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/inquaire_test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-e2e-tests';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64); // 64-character key for testing
  process.env.NODE_ENV = 'test';

  const extraProviders =
    process.env.BULL_DISABLED === 'true'
      ? [
          { provide: 'BullQueue_ai-analysis', useValue: { add: jest.fn(), pause: jest.fn() } },
          { provide: 'BullQueue_webhooks', useValue: { add: jest.fn(), pause: jest.fn() } },
        ]
      : [];

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
    providers: extraProviders,
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Validation pipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Webhooks may send extra fields
      transform: true,
    })
  );

  // Global Interceptors 설정 (main.ts와 동일하게)
  app.useGlobalInterceptors(
    new TransformInterceptor() // Response transformation
  );

  await app.init();
  return app;
}

/**
 * 테스트 사용자 생성
 */
export async function createTestUser(
  prisma: PrismaService,
  email: string = `test-${Date.now()}@example.com`,
  password: string = 'TestPassword123!'
): Promise<{ id: string; email: string }> {
  const user = await prisma.write.user.create({
    data: {
      email,
      password_hash: `hashed-${password}`, // Mock bcrypt hash
      name: 'Test User',
      role: 'USER',
    },
  });

  return { id: user.id, email: user.email };
}

/**
 * 테스트 비즈니스 생성
 */
export async function createTestBusiness(
  prisma: PrismaService,
  ownerId: string,
  name: string = `Test Business ${Date.now()}`
): Promise<{ id: string; name: string }> {
  const business = await prisma.write.business.create({
    data: {
      name,
      owner_id: ownerId,
      industry_type: IndustryType.OTHER,
    },
  });

  return { id: business.id, name: business.name };
}

/**
 * 테스트 채널 생성
 */
export async function createTestChannel(
  prisma: PrismaService,
  businessId: string,
  platform: 'KAKAO' | 'LINE' = 'KAKAO',
  name: string = `Test ${platform} Channel`
): Promise<{ id: string; name: string; platform: string }> {
  const channel = await prisma.write.channel.create({
    data: {
      business_id: businessId,
      name,
      platform,
      platform_channel_id: `test-${platform.toLowerCase()}-channel-${Date.now()}`,
      access_token: `test-${platform.toLowerCase()}-token`,
    },
  });

  return {
    id: channel.id,
    name: channel.name || name,
    platform: (channel.platform as 'KAKAO' | 'LINE') || platform,
  };
}

/**
 * 테스트 고객 생성
 */
export async function createTestCustomer(
  prisma: PrismaService,
  businessId: string,
  platform: 'KAKAO' | 'LINE' = 'KAKAO',
  platformUserId: string = `test-user-${Date.now()}`
): Promise<{ id: string; platform_user_id: string }> {
  const customer = await prisma.write.customer.create({
    data: {
      business_id: businessId,
      platform_user_id: platformUserId,
      platform,
      name: 'Test Customer',
    },
  });

  return { id: customer.id, platform_user_id: customer.platform_user_id || '' };
}

/**
 * 로그인하여 액세스 토큰 획득
 */
export async function loginAndGetToken(
  app: INestApplication,
  email: string,
  password: string
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return (response.body.data?.access_token as string) || '';
}

/**
 * 테스트 데이터 정리
 */
export async function cleanupTestData(
  prisma: PrismaService,
  ids: {
    userIds?: string[];
    businessIds?: string[];
    channelIds?: string[];
    customerIds?: string[];
    inquiryIds?: string[];
  }
): Promise<void> {
  const {
    userIds = [],
    businessIds = [],
    channelIds = [],
    customerIds = [],
    inquiryIds = [],
  } = ids;

  // 순서 중요: 외래 키 제약 조건 때문에 역순으로 삭제
  if (inquiryIds.length > 0) {
    await prisma.write.inquiry.deleteMany({
      where: { id: { in: inquiryIds } },
    });
  }

  if (customerIds.length > 0) {
    await prisma.write.customer.deleteMany({
      where: { id: { in: customerIds } },
    });
  }

  if (channelIds.length > 0) {
    await prisma.write.channel.deleteMany({
      where: { id: { in: channelIds } },
    });
  }

  if (businessIds.length > 0) {
    await prisma.write.business.deleteMany({
      where: { id: { in: businessIds } },
    });
  }

  if (userIds.length > 0) {
    await prisma.write.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }
}
