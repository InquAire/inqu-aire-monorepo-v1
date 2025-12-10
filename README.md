# InquAire Monorepo

AI 기반 상담 관리 시스템의 백엔드 API 및 관리자 클라이언트를 포함한 모노레포입니다.

## 기술 스택

- **모노레포**: Turborepo + pnpm workspaces
- **백엔드**: NestJS, TypeScript, Prisma, PostgreSQL, Redis, BullMQ
- **프론트엔드**: React 19, TanStack Router, TailwindCSS, Radix UI
- **인프라**: Docker Compose, AWS (ECS, RDS, ElastiCache, S3, SES)

## 프로젝트 구조

```
inqu-aire-monorepo/
├── apps/
│   ├── inquaire-api-server/    # NestJS API 서버
│   └── inquaire-admin-client/  # React 관리자 웹 클라이언트
├── packages/
│   └── nestjs-shared/          # 공용 DTO, 유틸, 타입
└── tools/
    └── cli/                    # 내부 CLI 도구 (ai)
```

## 시작하기

> 자세한 설정 가이드는 [Quick Start](./docs/quick-start.md)를 참고하세요.

### 필수 요구사항

- Node.js 18.18.0 이상
- pnpm 10.x
- Docker Desktop

### 설치

```bash
# 의존성 설치
pnpm install

# CLI 전역 설치 (권장)
pnpm run install:cli

# 또는 수동 설치
pnpm -C tools/cli build && pnpm -C tools/cli link --global

# 부트스트랩 (공유 패키지 빌드 + Prisma 생성)
ai bootstrap
```

### 로컬 개발 환경 실행

```bash
# Docker 인프라 실행 (PostgreSQL, Redis)
ai stack up

# 데이터베이스 마이그레이션
ai db migrate

# API 서버 실행 (개발 모드)
pnpm dev:api

# 관리자 클라이언트 실행
pnpm dev:admin
```

## 주요 명령어

### 루트 레벨

| 명령어           | 설명                             |
| ---------------- | -------------------------------- |
| `pnpm dev:api`   | API 서버 개발 모드 실행          |
| `pnpm dev:admin` | 관리자 클라이언트 개발 모드 실행 |
| `pnpm build`     | 전체 빌드                        |
| `pnpm test`      | 전체 테스트 실행                 |
| `pnpm lint`      | 린트 검사                        |
| `pnpm format`    | 코드 포맷팅                      |

### CLI 도구 (`ai`)

```bash
ai --help              # 도움말

# 인프라
ai stack up            # Docker 스택 실행
ai stack down          # Docker 스택 종료
ai stack logs          # 로그 확인

# 데이터베이스
ai db migrate          # 마이그레이션 실행
ai db dev --name xxx   # 새 마이그레이션 생성
ai db generate         # Prisma 클라이언트 재생성
ai db studio           # Prisma Studio 실행
ai db seed             # 시드 데이터 삽입

# 환경 변수
ai env --check         # 필수 환경 변수 검증
ai bootstrap           # 프로젝트 초기 설정
```

## 환경 변수

1. `.env.example`을 복사하여 `.env` 생성
2. 필요한 값 설정
3. `ai env --check`로 검증

주요 환경 변수:

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=...
OPENAI_API_KEY=...
```

## 개발 가이드

### 코드 스타일

- TypeScript strict 모드
- 2 스페이스 인덴트, 단일 따옴표, 세미콜론
- ESLint + Prettier 적용

### 커밋 규칙

Conventional Commits 사용:

```
feat(api): add user authentication
fix(admin): resolve login redirect issue
refactor(shared): simplify validation logic
```

### 테스트

```bash
# 단위 테스트
pnpm -C apps/inquaire-api-server test

# E2E 테스트
pnpm -C apps/inquaire-api-server test:e2e

# 커버리지
pnpm -C apps/inquaire-api-server test:cov
```

## 배포

### 로컬에서 배포

```bash
# API 서버 (ECS)
DEPLOY_ENV=production pnpm deploy:api:local

# 관리자 웹
DEPLOY_ENV=production pnpm deploy:admin-web:local
```

### GitHub Actions

`main` 브랜치에 푸시하면 자동 배포됩니다.

## 문제 해결

### CLI 재설치

```bash
# 기존 CLI 제거
pnpm run uninstall:cli

# 재설치
pnpm run install:cli

# 확인
ai --help
```

### Prisma 클라이언트 오류

```bash
ai db generate
```

### Docker 관련 문제

```bash
ai stack down
docker system prune -f
ai stack up
```

## 문서

- [Quick Start](./docs/quick-start.md) - 5분 안에 로컬 환경 구축하기

## 라이선스

Private - All rights reserved
