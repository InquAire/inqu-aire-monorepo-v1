import type { ErrorLog, PrismaClient, User } from '../../generated';

export async function seedErrorLogs(prisma: PrismaClient, users: User[]): Promise<ErrorLog[]> {
  console.log('🚨 Creating error logs...');

  const now = new Date();
  const logs: ErrorLog[] = [];

  // AI 서비스 에러
  logs.push(
    await prisma.errorLog.create({
      data: {
        user_id: users[0].id,
        error_type: 'ai_error',
        error_code: 'AI_TIMEOUT',
        error_message: 'AI service response timeout after 30 seconds',
        stack_trace: `Error: AI service timeout
    at AIService.analyze (/app/src/modules/ai/ai.service.ts:45:11)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at InquiryService.processInquiry (/app/src/modules/inquiries/inquiries.service.ts:89:20)`,
        context: {
          inquiry_id: 'inq_sample_001',
          model: 'gpt-4',
          input_length: 500,
        },
        resolved: true,
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 2),
        occurred_at: new Date(now.getTime() - 1000 * 60 * 60 * 3),
      },
    })
  );

  // Webhook 에러
  logs.push(
    await prisma.errorLog.create({
      data: {
        user_id: null,
        error_type: 'webhook_error',
        error_code: 'INVALID_SIGNATURE',
        error_message: 'Webhook signature verification failed',
        stack_trace: `Error: Invalid webhook signature
    at WebhookService.verifySignature (/app/src/modules/webhooks/webhooks.service.ts:120:15)
    at WebhookController.handleKakao (/app/src/modules/webhooks/webhooks.controller.ts:35:22)`,
        context: {
          platform: 'KAKAO',
          channel_id: 'ch_sample_001',
          ip: '203.xxx.xxx.xxx',
        },
        resolved: false,
        occurred_at: new Date(now.getTime() - 1000 * 60 * 30),
      },
    })
  );

  // API 에러
  logs.push(
    await prisma.errorLog.create({
      data: {
        user_id: users[1].id,
        error_type: 'api_error',
        error_code: 'RATE_LIMIT_EXCEEDED',
        error_message: 'API rate limit exceeded for user',
        stack_trace: null,
        context: {
          endpoint: '/api/v1/inquiries',
          method: 'GET',
          requests_count: 150,
          limit: 100,
          window: '1 minute',
        },
        resolved: true,
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60),
        occurred_at: new Date(now.getTime() - 1000 * 60 * 90),
      },
    })
  );

  // 데이터베이스 에러
  logs.push(
    await prisma.errorLog.create({
      data: {
        user_id: null,
        error_type: 'database_error',
        error_code: 'CONNECTION_TIMEOUT',
        error_message: 'Database connection pool exhausted',
        stack_trace: `Error: Connection pool timeout
    at PrismaService.$connect (/app/src/infrastructure/database/prisma/prisma.service.ts:25:10)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`,
        context: {
          pool_size: 10,
          active_connections: 10,
          waiting_requests: 25,
        },
        resolved: true,
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 24),
        occurred_at: new Date(now.getTime() - 1000 * 60 * 60 * 25),
      },
    })
  );

  // 결제 에러
  logs.push(
    await prisma.errorLog.create({
      data: {
        user_id: users[2].id,
        error_type: 'payment_error',
        error_code: 'CARD_DECLINED',
        error_message: 'Payment failed: Card was declined by the issuer',
        stack_trace: null,
        context: {
          payment_id: 'pay_sample_001',
          amount: 99000,
          card_last_four: '1234',
          issuer_response: 'Insufficient funds',
        },
        resolved: false,
        occurred_at: new Date(now.getTime() - 1000 * 60 * 15),
      },
    })
  );

  // 인증 에러
  logs.push(
    await prisma.errorLog.create({
      data: {
        user_id: null,
        error_type: 'auth_error',
        error_code: 'INVALID_TOKEN',
        error_message: 'JWT token verification failed: Token expired',
        stack_trace: `Error: jwt expired
    at JwtAuthGuard.canActivate (/app/src/modules/auth/guards/jwt-auth.guard.ts:28:15)
    at GuardsConsumer.tryActivate (/app/node_modules/@nestjs/core/guards/guards-consumer.js:15:34)`,
        context: {
          token_issued_at: new Date(now.getTime() - 1000 * 60 * 60 * 25).toISOString(),
          expired_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
          ip: '192.168.1.100',
        },
        resolved: true,
        resolved_at: new Date(now.getTime() - 1000 * 60 * 45),
        occurred_at: new Date(now.getTime() - 1000 * 60 * 50),
      },
    })
  );

  // 외부 서비스 에러
  logs.push(
    await prisma.errorLog.create({
      data: {
        user_id: null,
        error_type: 'external_service_error',
        error_code: 'KAKAO_API_ERROR',
        error_message: 'Kakao API returned error: Service temporarily unavailable',
        stack_trace: `Error: Kakao API Error
    at KakaoService.sendMessage (/app/src/modules/platforms/kakao/kakao.service.ts:78:11)
    at PlatformService.sendReply (/app/src/modules/platforms/platform.service.ts:45:20)`,
        context: {
          api_endpoint: 'https://kapi.kakao.com/v2/api/talk/memo/default/send',
          http_status: 503,
          response_body: {
            error: 'Service unavailable',
            error_description: 'Please try again later',
          },
        },
        resolved: true,
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 5),
        occurred_at: new Date(now.getTime() - 1000 * 60 * 60 * 6),
      },
    })
  );

  // 유효성 검증 에러
  logs.push(
    await prisma.errorLog.create({
      data: {
        user_id: users[3].id,
        error_type: 'validation_error',
        error_code: 'INVALID_INPUT',
        error_message: 'Input validation failed for inquiry creation',
        stack_trace: null,
        context: {
          endpoint: '/api/v1/inquiries',
          method: 'POST',
          validation_errors: [
            { field: 'message_text', error: 'must be at least 1 character' },
            { field: 'channel_id', error: 'must be a valid UUID' },
          ],
        },
        resolved: true,
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 10),
        occurred_at: new Date(now.getTime() - 1000 * 60 * 60 * 10),
      },
    })
  );

  console.log(`✅ Created ${logs.length} error logs`);
  return logs;
}
