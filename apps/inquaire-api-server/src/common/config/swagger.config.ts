import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('AI 상담 매니저 API')
  .setDescription(
    `
## AI 상담 매니저 API 문서

AI 기반 자동 문의 관리 시스템 REST API

### 주요 기능
- 🤖 AI 기반 문의 자동 분석 및 답변
- 💬 Kakao Talk, LINE 메시징 플랫폼 연동
- 📊 실시간 문의 통계 및 대시보드
- 👥 고객 관리 및 이력 추적
- 🏢 멀티 테넌시 (사업체별 격리)

### 인증
모든 API는 JWT Bearer 토큰을 사용합니다.

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

### 에러 응답
모든 에러는 다음 형식을 따릅니다:

\`\`\`json
{
  "statusCode": 400,
  "message": "에러 메시지",
  "timestamp": "2025-01-16T10:00:00.000Z",
  "path": "/api/endpoint"
}
\`\`\`

### Rate Limiting
- 기본: 100 requests / 60 seconds
- Auth 엔드포인트: 10 requests / 60 seconds
  `
  )
  .setVersion('1.0.0')
  .setContact('AI Next Team', 'https://ainext.com', 'support@ainext.com')
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'JWT 액세스 토큰을 입력하세요',
      in: 'header',
    },
    'JWT'
  )
  .addTag('auth', '인증 - 회원가입, 로그인, 토큰 갱신')
  .addTag('businesses', '사업체 - 사업체 관리 및 대시보드')
  .addTag('channels', '채널 - Kakao/LINE 채널 관리')
  .addTag('customers', '고객 - 고객 정보 및 이력 관리')
  .addTag('inquiries', '문의 - 문의 관리 및 AI 분석')
  .addTag('ai', 'AI - AI 분석 및 답변 생성')
  .addTag('webhooks', 'Webhooks - 메시징 플랫폼 Webhook')
  .addTag('health', '헬스체크 - 서버 상태 확인')
  .addServer(process.env.API_URL || 'http://localhost:3000', 'Development')
  .addServer('https://api.inquaire.com', 'Production')
  .build();

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  // Swagger UI 설정
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'AI 상담 매니저 API 문서',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { background: #fafafa; padding: 20px; margin: 20px 0 }
    `,
  });

  // OpenAPI JSON 파일 저장 (버전별)
  saveOpenApiSpec(document);
}

function saveOpenApiSpec(document: OpenAPIObject): void {
  const outputPath = join(process.cwd(), 'docs', 'api');

  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true });
  }

  const version = document.info?.version || '1.0.0';
  const timestamp = new Date().toISOString().split('T')[0];

  // 최신 버전
  writeFileSync(join(outputPath, 'openapi.json'), JSON.stringify(document, null, 2));

  // 버전별 아카이브
  writeFileSync(join(outputPath, `openapi-v${version}.json`), JSON.stringify(document, null, 2));

  // 날짜별 스냅샷
  writeFileSync(join(outputPath, `openapi-${timestamp}.json`), JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI spec saved to ${outputPath}`);
}
