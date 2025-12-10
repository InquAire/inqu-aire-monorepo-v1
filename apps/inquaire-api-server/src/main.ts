import { createValidationPipe } from '@ai-next/nestjs-shared';
import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as Sentry from '@sentry/node';
import compression from 'compression';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AppModule } from './app.module';
import { initializeSentry } from './common/config/sentry.config';
import { setupSwagger } from './common/config/swagger.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CsrfGuard } from './common/guards/csrf.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { XssSanitizeInterceptor } from './common/interceptors/xss-sanitize.interceptor';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { CustomLoggerService } from './common/modules/logger/logger.service';
import { MetricsService } from './common/modules/metrics/metrics.service';
import type { RawBodyRequest } from './common/types/raw-body-request.interface';

async function bootstrap() {
  // Initialize Sentry first (before app creation)
  initializeSentry(process.env.SENTRY_DSN);

  // Create NestJS application with buffered logging
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true, // Buffer logs until Winston logger is ready
    abortOnError: false, // Don't crash on startup errors
  });

  // Use Winston logger globally
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Get custom logger for bootstrap logging
  const customLogger = app.get(CustomLoggerService);
  const metricsService = app.get(MetricsService);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 8443;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isDevelopment = nodeEnv !== 'production';

  // ============================================
  // 보안 설정 (Security)
  // ============================================

  // Sentry middleware (must be first)
  // Note: In Sentry v10+, request/tracing handlers are set up via integrations
  // The expressIntegration() in sentry.config.ts handles this automatically

  // Helmet - 보안 헤더 설정
  app.use(
    helmet({
      // Content Security Policy (CSP)
      contentSecurityPolicy: isDevelopment
        ? {
            // 개발 환경: Swagger 지원을 위한 느슨한 정책
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI 스크립트
              styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI 스타일
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          }
        : {
            // 프로덕션: 엄격한 보안 정책
            directives: {
              defaultSrc: ["'self'"], // 기본적으로 자기 도메인만 허용
              scriptSrc: ["'self'"], // 스크립트는 자기 도메인만
              styleSrc: ["'self'", "'unsafe-inline'"], // 스타일은 인라인 허용 (필요시)
              imgSrc: ["'self'", 'data:', 'https:'], // 이미지는 HTTPS만
              connectSrc: ["'self'"], // API 요청은 자기 도메인만
              fontSrc: ["'self'"], // 폰트는 자기 도메인만
              objectSrc: ["'none'"], // object/embed 차단
              mediaSrc: ["'self'"], // 미디어는 자기 도메인만
              frameSrc: ["'none'"], // iframe 차단
              baseUri: ["'self'"], // base 태그 제한
              formAction: ["'self'"], // form action 제한
              frameAncestors: ["'none'"], // Clickjacking 방지
              upgradeInsecureRequests: [], // HTTP를 HTTPS로 자동 업그레이드
            },
          },

      // Cross-Origin-Embedder-Policy
      crossOriginEmbedderPolicy: false, // Swagger를 위해 비활성화

      // Cross-Origin-Opener-Policy
      crossOriginOpenerPolicy: { policy: 'same-origin' },

      // Cross-Origin-Resource-Policy
      crossOriginResourcePolicy: { policy: 'same-origin' },

      // DNS Prefetch Control
      dnsPrefetchControl: { allow: false },

      // Frameguard (Clickjacking 방지)
      frameguard: { action: 'deny' },

      // Hide Powered-By header
      hidePoweredBy: true,

      // HSTS (HTTP Strict Transport Security)
      hsts: {
        maxAge: 31536000, // 1년
        includeSubDomains: true,
        preload: true,
      },

      // No Sniff (MIME 타입 스니핑 방지)
      noSniff: true,

      // Origin Agent Cluster
      originAgentCluster: true,

      // Permitted Cross-Domain Policies
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },

      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // Request ID Middleware (로그 추적을 위한 고유 ID 할당)
  app.use(requestIdMiddleware);

  // Permissions-Policy (추가 보안 헤더)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=()',
        'encrypted-media=()',
        'fullscreen=(self)',
        'picture-in-picture=()',
      ].join(', ')
    );
    next();
  });

  // CORS 설정 (CSRF 보호 강화)
  const corsOrigins = configService.get<string>('CORS_ORIGIN');
  const defaultDevOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173', // Vite 기본 포트
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173',
  ];

  app.enableCors({
    origin: corsOrigins
      ? corsOrigins.split(',').map(origin => origin.trim())
      : isDevelopment
        ? defaultDevOrigins // 개발 환경: 명시적 localhost 리스트
        : false, // 프로덕션: CORS_ORIGIN 환경 변수 필수
    credentials: true, // 쿠키 허용
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-CSRF-Token', // CSRF 토큰 헤더
    ],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24시간
  });

  // Trust proxy (Load Balancer 뒤에서 실행될 때)
  app.set('trust proxy', 1);

  // Body parser with raw body preservation for webhook signature verification
  // 2MB limit: 웹훅 페이로드와 API 요청에 충분하며 DoS 공격 방어
  app.useBodyParser('json', {
    limit: '2mb',
    verify: (req: RawBodyRequest, _res: Response, buf: Buffer) => {
      // Store raw body buffer for webhook signature verification
      req.rawBody = buf;
    },
  });
  app.useBodyParser('urlencoded', { limit: '2mb', extended: true });

  // ============================================
  // 성능 최적화 (Performance)
  // ============================================

  // Compression - gzip 압축
  app.use(
    compression({
      filter: (req, _res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, _res);
      },
      threshold: 1024, // 1KB 이상만 압축
    })
  );

  // ============================================
  // Global 설정
  // ============================================

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: [
      'health', // Health check는 /health로 접근 가능
      'metrics', // Metrics는 /metrics로 접근 가능
    ],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    createValidationPipe({
      whitelist: true, // DTO에 없는 속성 제거
      forbidNonWhitelisted: true, // DTO에 없는 속성 있으면 에러
      transform: true, // 타입 자동 변환
      transformOptions: {
        enableImplicitConversion: true, // string -> number 등 암시적 변환
      },
      disableErrorMessages: !isDevelopment, // 프로덕션에서는 상세 에러 숨김
    })
  );

  // Global Exception Filter with Sentry integration
  app.useGlobalFilters(new AllExceptionsFilter(customLogger));

  // Global Guards (보안)
  const reflector = app.get('Reflector');
  app.useGlobalGuards(
    new CsrfGuard(reflector, configService, customLogger) // CSRF protection via Origin/Referer validation
  );

  // Global Interceptors
  app.useGlobalInterceptors(
    new XssSanitizeInterceptor(), // XSS prevention - sanitize all inputs (MUST be first)
    new LoggingInterceptor(customLogger), // HTTP request/response logging
    new MetricsInterceptor(metricsService), // Prometheus metrics collection
    new TransformInterceptor() // Response transformation
  );

  // ============================================
  // Swagger API 문서 (개발 환경에서만)
  // ============================================

  if (isDevelopment) {
    setupSwagger(app);
    logger.log('📚 Swagger documentation enabled at /api/docs');
  }

  // ============================================
  // Graceful Shutdown 설정
  // ============================================

  app.enableShutdownHooks();

  // SIGTERM, SIGINT 시그널 처리
  const gracefulShutdown = async (signal: string) => {
    logger.log(`${signal} signal received. Starting graceful shutdown...`);

    try {
      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Unhandled rejection/exception 처리
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    Sentry.captureException(reason);
  });

  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception:', error);
    Sentry.captureException(error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // ============================================
  // 서버 시작
  // ============================================

  await app.listen(port, '0.0.0.0');

  // 시작 정보 출력
  const serverUrl = `http://localhost:${port}`;
  logger.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  🚀 AI Inquiry Manager API Server                       ║
║                                                          ║
║  Environment: ${nodeEnv.padEnd(43)}║
║  Port:        ${port.toString().padEnd(43)}║
║  URL:         ${serverUrl.padEnd(43)}║
║                                                          ║
║  📚 API Docs:  ${serverUrl}/api/docs${' '.repeat(Math.max(0, 25 - serverUrl.length))}║
║  🏥 Health:    ${serverUrl}/health${' '.repeat(Math.max(0, 27 - serverUrl.length))}║
║  📊 Metrics:   ${serverUrl}/metrics${' '.repeat(Math.max(0, 26 - serverUrl.length))}║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);

  // 추가 정보 (개발 환경에서만)
  if (isDevelopment) {
    logger.log('🔧 Development mode features:');
    logger.log('  - Detailed error messages');
    logger.log('  - Swagger documentation');
    logger.log('  - Verbose logging');
  } else {
    logger.log('🔒 Production mode:');
    logger.log('  - Enhanced security headers');
    logger.log('  - Response compression');
    logger.log('  - Optimized logging');
  }
}

bootstrap().catch(error => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error);
  process.exit(1);
});
