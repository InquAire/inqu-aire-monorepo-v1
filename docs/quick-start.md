# InquAire Quick Start Guide

> 5분 안에 InquAire 로컬 개발 환경 구축하기

이 가이드는 InquAire 프로젝트를 처음 시작하는 개발자를 위한 빠른 시작 가이드입니다.

## 📋 필수 조건

시작하기 전에 다음 도구들이 설치되어 있어야 합니다:

- **Node.js** 18.x 이상 ([다운로드](https://nodejs.org/))
- **pnpm** 8.x 이상 ([설치](https://pnpm.io/installation))
- **Docker Desktop** ([다운로드](https://www.docker.com/products/docker-desktop))
- **Git** ([다운로드](https://git-scm.com/downloads))

설치 확인:

```bash
node --version   # v18.0.0 이상
pnpm --version   # 8.0.0 이상
docker --version # Docker version 20.0.0 이상
git --version    # git version 2.0.0 이상
```

## 🚀 5분 안에 시작하기

### 1단계: 프로젝트 클론 (30초)

```bash
git clone <repository-url>
cd inqu-aire-monorepo-v1
```

### 2단계: 의존성 설치 (2분)

```bash
pnpm install
```

### 3단계: Docker 인프라 시작 (1분)

```bash
# PostgreSQL, Redis 시작
cd infrastructure/local
docker-compose up -d
cd ../..
```

확인:

```bash
docker ps
# postgres와 redis 컨테이너가 실행 중이어야 합니다
```

### 4단계: 환경 변수 설정 (30초)

```bash
# 루트 디렉토리에 .env 파일 생성
cp .env.example .env
```

`.env` 파일 내용 (기본값으로 충분):

```env
# Database
DATABASE_URL="postgresql://inquaire:inquaire@localhost:5432/inquaire_dev"
DATABASE_READ_URL="postgresql://inquaire:inquaire@localhost:5432/inquaire_dev"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRATION="7d"

# OpenAI (선택사항 - AI 기능 사용 시)
OPENAI_API_KEY="sk-your-openai-api-key"

# CORS
CORS_ORIGIN="http://localhost:5173"
```

### 5단계: 데이터베이스 설정 (30초)

```bash
# Prisma 클라이언트 생성
pnpm --filter @inquaire/prisma generate

# 마이그레이션 실행
pnpm --filter @inquaire/prisma migrate:dev
```

### 6단계: API Server 시작 (30초)

새 터미널 탭에서:

```bash
pnpm --filter inquaire-api-server dev
```

API가 `http://localhost:3000`에서 실행됩니다.

확인:

```bash
curl http://localhost:3000/health
# 응답: {"status":"ok","timestamp":"..."}
```

### 7단계: Admin Client 시작 (30초)

또 다른 터미널 탭에서:

```bash
# Admin Client 환경 변수 설정
cd apps/inquaire-admin-client
cp .env.example .env.local

# 개발 서버 시작
pnpm dev
```

Admin Client가 `http://localhost:5173`에서 실행됩니다.

브라우저에서 `http://localhost:5173`을 열어 확인합니다.

## ✅ 설치 확인

모든 것이 정상적으로 작동하는지 확인:

### 1. Docker 컨테이너 확인

```bash
docker ps
```

다음 컨테이너들이 실행 중이어야 합니다:

- `inquaire-postgres`
- `inquaire-redis`

### 2. API Server 확인

```bash
# 헬스 체크
curl http://localhost:3000/health

# Swagger 문서 확인
open http://localhost:3000/api
```

### 3. Admin Client 확인

브라우저에서 `http://localhost:5173`을 열고:

- 로그인 페이지가 표시되는지 확인
- 네트워크 탭에서 API 연결 확인

## 🎯 다음 단계

### 초기 데이터 생성 (선택사항)

```bash
# 테스트용 초기 데이터 생성
pnpm --filter @inquaire/prisma db:seed
```

### 관리자 계정 생성

Prisma Studio를 사용하여 관리자 계정 생성:

```bash
pnpm --filter @inquaire/prisma db:studio
```

또는 API를 통해 회원가입:

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@inquaire.com",
    "password": "Admin123!",
    "name": "관리자",
    "role": "SUPER_ADMIN"
  }'
```

## 📚 주요 페이지 및 기능

Admin Client에 로그인한 후 다음 페이지들을 확인할 수 있습니다:

### 대시보드 (`/dashboard`)

- 실시간 통계 및 차트
- 최근 문의 목록
- Excel 통계 내보내기

### 고객 관리 (`/customers`)

- 고객 목록 및 검색
- 고객 추가/편집/삭제
- 활동 이력 조회

### 사업체 관리 (`/businesses`)

- 사업체 CRUD
- 업종별 필터링

### 문의 관리 (`/inquiries`)

- 문의 목록 및 필터
- AI 분석 기능
- 답변 작성 및 이력

### 채널 관리 (`/channels`)

- 메시징 채널 관리
- Webhook URL 관리
- 채널별 통계

## 🛠 개발 도구

### Prisma Studio (데이터베이스 GUI)

```bash
pnpm --filter @inquaire/prisma db:studio
```

브라우저에서 `http://localhost:5555`를 엽니다.

### API 문서 (Swagger)

API가 실행 중일 때 `http://localhost:3000/api`에서 확인할 수 있습니다.

### 로그 확인

```bash
# API Server 로그
# 터미널에서 실시간 확인

# Docker 로그
docker-compose -f infrastructure/local/docker-compose.yml logs -f postgres
docker-compose -f infrastructure/local/docker-compose.yml logs -f redis
```

## 🔧 일반적인 문제 해결

### 문제: "Port 3000 is already in use"

다른 프로세스가 3000번 포트를 사용 중입니다.

```bash
# 포트 사용 중인 프로세스 찾기
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

### 문제: "Database connection failed"

PostgreSQL 컨테이너가 실행 중인지 확인:

```bash
docker ps | grep postgres

# 컨테이너가 없다면 시작
cd infrastructure/local
docker-compose up -d postgres
```

### 문제: "Prisma Client not generated"

Prisma 클라이언트를 다시 생성:

```bash
pnpm --filter @inquaire/prisma generate
```

### 문제: Admin Client에서 API 연결 오류

환경 변수가 올바른지 확인:

```bash
# apps/inquaire-admin-client/.env.local
cat apps/inquaire-admin-client/.env.local
```

`VITE_API_BASE_URL=http://localhost:3000`이 설정되어 있어야 합니다.

### 문제: "pnpm: command not found"

pnpm을 설치:

```bash
npm install -g pnpm
```

## 📖 추가 문서

상세한 정보는 다음 문서를 참조하세요:

- **[README](../README.md)** - 프로젝트 개요 및 명령어
- **[.env.example](../.env.example)** - 환경 변수 설정 예시

## 🎓 학습 리소스

### 프로젝트 기술 스택

- **NestJS** - [공식 문서](https://docs.nestjs.com/)
- **Prisma** - [공식 문서](https://www.prisma.io/docs)
- **React** - [공식 문서](https://react.dev/)
- **TanStack Router** - [공식 문서](https://tanstack.com/router)
- **TanStack Query** - [공식 문서](https://tanstack.com/query)
- **Tailwind CSS** - [공식 문서](https://tailwindcss.com/docs)

### 아키텍처 패턴

- **Feature-Sliced Design** - [공식 사이트](https://feature-sliced.design/)
- **Monorepo** - [Turborepo 문서](https://turbo.build/repo/docs)

## 💡 개발 팁

### 코드 변경 시 자동 재시작

API Server와 Admin Client 모두 파일 변경 시 자동으로 재시작됩니다.

### 데이터베이스 스키마 변경

```bash
# 1. schema.prisma 수정
# 2. 마이그레이션 생성
pnpm --filter @inquaire/prisma migrate:dev --name your_change_description

# 3. 클라이언트 재생성 (자동으로 실행됨)
```

### 새로운 API 엔드포인트 추가

1. Controller 생성: `src/modules/your-module/your-module.controller.ts`
2. Service 생성: `src/modules/your-module/your-module.service.ts`
3. Module 생성: `src/modules/your-module/your-module.module.ts`
4. `app.module.ts`에 추가

### 새로운 Admin 페이지 추가

1. 라우트 파일 생성: `src/routes/_layout/your-page.tsx`
2. Entity 계층 구성: `src/entities/your-entity/`
3. API 클라이언트 및 React Query 훅 추가

## 🤝 기여하기

1. Feature 브랜치 생성
2. 변경사항 커밋 (Conventional Commits 사용)
3. Pull Request 제출
