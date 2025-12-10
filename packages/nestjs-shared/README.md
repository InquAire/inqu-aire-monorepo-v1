# @ai-next/shared - 공통 유틸리티 패키지

서버의 모든 패키지에서 공통으로 사용되는 유틸리티, 타입, 데코레이터, 가드 등을 제공합니다.

## 🚀 주요 기능

### **타입 시스템 (Types)**

- **공통 타입**: 기본 인터페이스 및 타입 정의
- **응답 타입**: API 응답 표준화
- **페이징 타입**: 커서 기반 페이지네이션
- **인증 타입**: JWT 페이로드 및 사용자 정보
- **OpenAPI 타입**: 자동 생성된 API 타입

### **데이터 전송 객체 (DTOs)**

- **커서 페이징**: 효율적인 페이지네이션
- **로케일 쿼리**: 다국어 지원

### **에러 처리 (Errors)**

- **에러 코드**: 표준화된 에러 코드
- **에러 빌더**: 일관된 에러 응답 생성

### **가드 (Guards)**

- **역할 기반 접근 제어**: 사용자 권한 검증

### **상수 (Constants)**

- **HTTP 헤더**: 표준 헤더 상수
- **로케일**: 지원 언어 및 지역
- **역할**: 사용자 권한 레벨
- **업로드 정책**: 파일 업로드 규칙

### **데코레이터 (Decorators)**

- **현재 사용자**: 인증된 사용자 정보 추출
- **공개 엔드포인트**: 인증 불필요 표시
- **역할 검증**: 특정 권한 요구사항

### **파이프 (Pipes)**

- **BigInt 파싱**: 문자열을 BigInt로 변환
- **커서 파싱**: 페이징 커서 처리
- **검증 파이프**: 표준화된 입력 검증

### **유틸리티 (Utils)**

- **커서**: 페이징 관련 헬퍼 함수
- **문자열**: 문자열 처리 유틸리티
- **시간**: 시간 관련 헬퍼 함수

### **로깅 (Logging)**

- **구조화된 로깅**: 일관된 로그 형식

### **보안 (Security)**

- **동의 관리**: 사용자 동의 처리
- **JWT 페이로드**: 토큰 정보 타입

### **테스팅 (Testing)**

- **테스트 헬퍼**: 테스트 코드 지원

## 📦 설치 및 사용

### **설치**

```bash
# 워크스페이스 내에서 자동으로 사용 가능
pnpm install
```

### **사용법**

```typescript
// 전체 패키지 import
import * as shared from '@ai-next/shared';

// 특정 모듈만 import
import { ResponseEnvelope, CursorPagingDto } from '@ai-next/shared';
import { RolesGuard, Public } from '@ai-next/shared';
import { deepMask, parseBigInt } from '@ai-next/shared';
```

## 🔧 상세 API 문서

### **1. 타입 시스템 (Types)**

#### **공통 타입 (Common Types)**

```typescript
// packages/nestjs-shared/src/types/common.ts
export interface BaseEntity {
  id: bigint;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
  };
}
```

#### **응답 타입 (Response Types)**

```typescript
// packages/nestjs-shared/src/types/response.ts
export interface ResponseEnvelope<T> {
  success: true;
  data: T;
  error: null;
  meta: {
    requestId?: string;
    display_locale?: string;
    fallback?: boolean;
  } & Record<string, unknown>;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  data: null;
}
```

#### **페이징 타입 (Paging Types)**

```typescript
// packages/nestjs-shared/src/types/paging.ts
export interface CursorPaging {
  cursor?: string;
  limit?: number;
  orderBy?: {
    field: string;
    dir: 'asc' | 'desc';
  };
}

export interface CursorPagingResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
```

#### **인증 타입 (Auth Types)**

```typescript
// packages/nestjs-shared/src/types/auth.ts
export interface JwtPayload {
  sub: string; // 사용자 ID
  email: string; // 이메일
  roles: string[]; // 역할 목록
  iat: number; // 발급 시간
  exp: number; // 만료 시간
}
```

### **2. DTOs (Data Transfer Objects)**

#### **CursorPagingDto**

```typescript
// packages/nestjs-shared/src/dto/cursor-paging.dto.ts
export class CursorPagingDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  orderBy?: { field: string; dir: 'asc' | 'desc' };

  @ValidateIf(o => typeof o.orderBy === 'string')
  @Matches(/^[a-z0-9_]+:(asc|desc)$/i, {
    message: 'orderBy must be "field:asc|desc"',
  })
  orderByRaw?: string;

  normalize(allowFields: string[]): this;
}
```

**사용법:**

```typescript
const paging = new CursorPagingDto();
paging.limit = 50;
paging.orderBy = { field: 'created_at', dir: 'desc' };

// 정규화 (허용된 필드만 사용)
const normalized = paging.normalize(['id', 'created_at', 'title']);
```

#### **LocaleQueryDto**

```typescript
// packages/nestjs-shared/src/dto/locale-query.dto.ts
export class LocaleQueryDto {
  @IsOptional()
  @IsString()
  locale?: string = 'ko';

  @IsOptional()
  @IsBoolean()
  fallback?: boolean = true;
}
```

**사용법:**

```typescript
const query = new LocaleQueryDto();
query.locale = 'en';
query.fallback = false;
```

### **3. 에러 처리 (Error Handling)**

#### **에러 코드 (Error Codes)**

```typescript
// packages/nestjs-shared/src/errors/codes.ts
export const ERROR_CODES = {
  // 인증 관련
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // 검증 관련
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // 리소스 관련
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;
```

#### **에러 빌더 (Error Builder)**

```typescript
// packages/nestjs-shared/src/errors/builder.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createError(
  code: string,
  message: string,
  statusCode?: number,
  details?: unknown
): ApiError;
```

**사용법:**

```typescript
import { createError, ERROR_CODES } from '@ai-next/shared';

throw createError(ERROR_CODES.NOT_FOUND, '사용자를 찾을 수 없습니다', 404, { userId: '123' });
```

### **4. 가드 (Guards)**

#### **RolesGuard**

```typescript
// packages/nestjs-shared/src/guards/roles.guard.ts
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}
```

**사용법:**

```typescript
import { Roles, RolesGuard } from '@ai-next/shared';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getUsers() {
    // 관리자만 접근 가능
  }
}
```

### **5. 상수 (Constants)**

#### **HTTP 헤더 (Headers)**

```typescript
// packages/nestjs-shared/src/constants/headers.ts
export const HEADERS = {
  REQUEST_ID: 'X-Request-ID',
  USER_AGENT: 'User-Agent',
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  ACCEPT_LANGUAGE: 'Accept-Language',
} as const;
```

#### **로케일 (Locales)**

```typescript
// packages/nestjs-shared/src/constants/locales.ts
export const SUPPORTED_LOCALES = ['ko', 'en', 'ja', 'zh'] as const;
export const DEFAULT_LOCALE = 'ko' as const;
export const FALLBACK_LOCALE = 'en' as const;
```

#### **역할 (Roles)**

```typescript
// packages/nestjs-shared/src/constants/roles.ts
export const ROLES = {
  USER: 'USER',
  PREMIUM: 'PREMIUM',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export const ROLE_HIERARCHY = {
  [ROLES.USER]: 1,
  [ROLES.PREMIUM]: 2,
  [ROLES.ADMIN]: 10,
  [ROLES.SUPER_ADMIN]: 100,
} as const;
```

#### **업로드 정책 (Upload Policy)**

```typescript
// packages/nestjs-shared/src/constants/upload-policy.ts
export const UPLOAD_POLICY = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav'],
  MAX_FILES_PER_REQUEST: 5,
} as const;
```

### **6. 데코레이터 (Decorators)**

#### **@Public()**

```typescript
// packages/nestjs-shared/src/decorators/public.decorator.ts
export const Public = () => SetMetadata('isPublic', true);
```

**사용법:**

```typescript
import { Public } from '@ai-next/shared';

@Controller('auth')
export class AuthController {
  @Post('login')
  @Public() // 인증 불필요
  login() {
    // 로그인 로직
  }
}
```

#### **@CurrentUser()**

```typescript
// packages/nestjs-shared/src/decorators/current-user.decorator.ts
export const CurrentUser = () =>
  createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  });
```

**사용법:**

```typescript
import { CurrentUser } from '@ai-next/shared';

@Controller('profile')
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.profileService.getProfile(user.sub);
  }
}
```

#### **@Roles()**

```typescript
// packages/nestjs-shared/src/decorators/roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

**사용법:**

```typescript
import { Roles } from '@ai-next/shared';

@Controller('admin')
export class AdminController {
  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getStats() {
    // 관리자 통계
  }
}
```

### **7. 파이프 (Pipes)**

#### **ParseBigIntPipe**

```typescript
// packages/nestjs-shared/src/pipes/parse-bigint.pipe.ts
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint;
}
```

**사용법:**

```typescript
import { ParseBigIntPipe } from '@ai-next/shared';

@Controller('users')
export class UserController {
  @Get(':id')
  getUser(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.userService.findById(id);
  }
}
```

#### **ParseCursorPipe**

```typescript
// packages/nestjs-shared/src/pipes/parse-cursor.pipe.ts
export class ParseCursorPipe implements PipeTransform<string, CursorPaging> {
  transform(value: string): CursorPaging;
}
```

**사용법:**

```typescript
import { ParseCursorPipe } from '@ai-next/shared';

@Controller('posts')
export class PostController {
  @Get()
  getPosts(@Query('cursor', ParseCursorPipe) cursor: CursorPaging) {
    return this.postService.findMany(cursor);
  }
}
```

#### **ValidationPipeFactory**

```typescript
// packages/nestjs-shared/src/pipes/validation-pipe.factory.ts
export function createValidationPipe(options?: ValidationPipeOptions): ValidationPipe;
```

**사용법:**

```typescript
import { createValidationPipe } from '@ai-next/shared';

// 전역 파이프로 설정
app.useGlobalPipes(
  createValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  })
);
```

### **8. 유틸리티 (Utils)**

#### **커서 유틸리티 (Cursor Utils)**

```typescript
// packages/nestjs-shared/src/utils/cursor.ts
export function encodeCursor(data: Record<string, any>): string;
export function decodeCursor(cursor: string): Record<string, any>;
export function buildCursorQuery(cursor: CursorPaging): any;
```

**사용법:**

```typescript
import { encodeCursor, decodeCursor } from '@ai-next/shared';

// 커서 인코딩
const cursor = encodeCursor({ id: 123, createdAt: '2024-01-01' });

// 커서 디코딩
const data = decodeCursor(cursor);
// { id: 123, createdAt: '2024-01-01' }
```

#### **문자열 유틸리티 (String Utils)**

```typescript
// packages/nestjs-shared/src/utils/string.ts
export function deepMask(obj: any, sensitiveKeys: string[]): any;
export function truncate(str: string, maxLength: number): string;
export function slugify(str: string): string;
```

**사용법:**

```typescript
import { deepMask, truncate, slugify } from '@ai-next/shared';

// 민감 정보 마스킹
const masked = deepMask(user, ['password', 'token']);

// 문자열 자르기
const short = truncate('긴 문자열입니다', 10); // "긴 문자열..."

// 슬러그 생성
const slug = slugify('Hello World!'); // "hello-world"
```

#### **시간 유틸리티 (Time Utils)**

```typescript
// packages/nestjs-shared/src/utils/time.ts
export function formatDate(date: Date, locale?: string): string;
export function parseDate(dateString: string): Date;
export function isExpired(date: Date): boolean;
export function addDays(date: Date, days: number): Date;
```

**사용법:**

```typescript
import { formatDate, isExpired, addDays } from '@ai-next/shared';

const now = new Date();
const formatted = formatDate(now, 'ko'); // "2024년 1월 1일"

const expired = isExpired(token.expiresAt);
const future = addDays(now, 7);
```

### **9. 보안 (Security)**

#### **동의 관리 (Consent Management)**

```typescript
// packages/nestjs-shared/src/security/consent.ts
export interface Consent {
  type: string;
  accepted: boolean;
  acceptedAt: Date;
  revokedAt?: Date;
}

export function validateConsent(consents: Consent[], required: string[]): boolean;
```

**사용법:**

```typescript
import { validateConsent } from '@ai-next/shared';

const hasRequiredConsent = validateConsent(userConsents, ['MARKETING', 'ANALYTICS']);
```

#### **JWT 페이로드 (JWT Payload)**

```typescript
// packages/nestjs-shared/src/security/jwt-payload.ts
export interface JwtPayload {
  sub: string; // 사용자 ID
  email: string; // 이메일
  roles: string[]; // 역할 목록
  permissions?: string[]; // 권한 목록
  iat: number; // 발급 시간
  exp: number; // 만료 시간
}

export function validateJwtPayload(payload: any): payload is JwtPayload;
```

### **10. 로깅 (Logging)**

#### **구조화된 로깅**

```typescript
// packages/nestjs-shared/src/logging/index.ts
export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  resource?: string;
}

export function createLogger(context?: LogContext): Logger;
export function logError(error: Error, context?: LogContext): void;
```

**사용법:**

```typescript
import { createLogger, logError } from '@ai-next/shared';

const logger = createLogger({
  requestId: 'req-123',
  userId: 'user-456',
});

logger.info('사용자 로그인', { email: 'user@example.com' });

try {
  // 작업 수행
} catch (error) {
  logError(error, { action: 'user_login' });
}
```

### **11. 테스팅 (Testing)**

#### **테스트 헬퍼**

```typescript
// packages/nestjs-shared/src/testing/index.ts
export function createMockUser(overrides?: Partial<User>): User;
export function createMockJwtPayload(overrides?: Partial<JwtPayload>): JwtPayload;
export function createMockRequest(overrides?: Partial<Request>): Request;
```

**사용법:**

```typescript
import { createMockUser, createMockJwtPayload } from '@ai-next/shared';

const mockUser = createMockUser({
  email: 'test@example.com',
  roles: ['ADMIN'],
});

const mockPayload = createMockJwtPayload({
  sub: '123',
  roles: ['USER'],
});
```

## 🎯 사용 시나리오

### **1. API 컨트롤러 구현**

```typescript
import {
  ResponseEnvelope,
  CursorPagingDto,
  @Public,
  @Roles,
  ParseBigIntPipe
} from '@ai-next/shared';

@Controller('posts')
export class PostController {
  @Get()
  @Public()
  async getPosts(@Query() paging: CursorPagingDto): Promise<ResponseEnvelope<Post[]>> {
    const posts = await this.postService.findMany(paging);
    return {
      success: true,
      data: posts,
      error: null,
      meta: { requestId: 'req-123' }
    };
  }

  @Post()
  @Roles('USER', 'ADMIN')
  async createPost(@Body() dto: CreatePostDto): Promise<ResponseEnvelope<Post>> {
    const post = await this.postService.create(dto);
    return { success: true, data: post, error: null, meta: {} };
  }
}
```

### **2. 에러 처리**

```typescript
import { createError, ERROR_CODES } from '@ai-next/shared';

@Controller('users')
export class UserController {
  @Get(':id')
  async getUser(@Param('id', ParseBigIntPipe) id: bigint) {
    const user = await this.userService.findById(id);

    if (!user) {
      throw createError(ERROR_CODES.NOT_FOUND, '사용자를 찾을 수 없습니다', 404, {
        userId: id.toString(),
      });
    }

    return user;
  }
}
```

### **3. 페이징 구현**

```typescript
import { CursorPagingDto, encodeCursor } from '@ai-next/shared';

@Injectable()
export class PostService {
  async findMany(paging: CursorPagingDto): Promise<CursorPagingResult<Post>> {
    const { limit = 20, cursor, orderBy } = paging;

    // 커서 디코딩
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    // 쿼리 실행
    const posts = await this.prisma.post.findMany({
      take: limit + 1, // 다음 페이지 확인용
      cursor: decodedCursor,
      orderBy: orderBy ? { [orderBy.field]: orderBy.dir } : { id: 'desc' },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;

    // 다음 커서 생성
    const nextCursor = hasMore
      ? encodeCursor({
          id: items[items.length - 1].id,
        })
      : undefined;

    return { items, nextCursor, hasMore };
  }
}
```

## ⚠️ 주의사항

### **타입 안전성**

- 모든 타입은 TypeScript strict 모드에서 검증됨
- 런타임 검증을 위해 class-validator 사용 권장

### **성능 고려사항**

- `deepMask`는 큰 객체에서 성능 이슈 가능성
- 페이징 시 적절한 인덱스 설정 필요

### **보안**

- 민감한 정보는 항상 마스킹 처리
- 역할 기반 접근 제어는 서버 측에서도 검증 필요

## 🔗 관련 링크

- [NestJS Documentation](https://docs.nestjs.com/)
- [class-validator](https://github.com/typestack/class-validator)
- [class-transformer](https://github.com/typestack/class-transformer)
- [JWT.io](https://jwt.io/)

## 📝 라이센스

ISC

---

**개발팀**: InquAire Team  
**버전**: 0.1.0  
**최종 업데이트**: 2024년
