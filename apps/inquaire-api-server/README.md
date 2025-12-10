# Inquaire API Server

AI 상담 매니저 Backend API Server

## 📁 프로젝트 구조

```
apps/inquaire-api-server/
├── src/                    # 소스 코드
│   ├── modules/           # 기능 모듈
│   ├── common/            # 공통 유틸리티
│   ├── config/            # 설정
│   └── database/          # 데이터베이스 (시드 등)
├── infra/                 # 인프라 관리
│   ├── docker/           # Docker 설정
│   └── scripts/          # 인프라 스크립트
├── envs/                  # 환경 변수
│   ├── .env.development  # 개발 환경
│   ├── .env.test         # 테스트 환경
│   └── .env.example      # 예제 파일
├── docs/                  # 문서
│   ├── guides/           # 가이드
│   └── infrastructure/   # 인프라 문서
├── scripts/               # 앱 관련 스크립트
├── test/                  # 테스트
└── monitoring/            # 모니터링 설정
```

## 🚀 빠른 시작

```bash
# 1. 인프라 설정
pnpm db:setup

# 2. 샘플 데이터 추가
pnpm db:seed

# 3. 서버 시작
pnpm start:dev
```

자세한 내용: [docs/guides/QUICK_START.md](docs/guides/QUICK_START.md)

## 📂 주요 폴더 안내

| 폴더 | 설명 | README |
|------|------|--------|
| `infra/` | Docker, 스크립트 등 인프라 관리 | [infra/README.md](infra/README.md) |
| `envs/` | 환경 변수 파일들 | [envs/README.md](envs/README.md) |
| `docs/` | 프로젝트 문서 | [docs/README.md](docs/README.md) |
| `src/` | 애플리케이션 소스 코드 | - |
| `test/` | 테스트 코드 | - |

## 📚 문서

- **빠른 시작**: [docs/guides/QUICK_START.md](docs/guides/QUICK_START.md)
- **Docker 가이드**: [docs/guides/README.DOCKER.md](docs/guides/README.DOCKER.md)
- **인프라 상세**: [docs/infrastructure/INFRASTRUCTURE.md](docs/infrastructure/INFRASTRUCTURE.md)
- **스키마 분리**: [docs/infrastructure/SCHEMA_SEPARATION.md](docs/infrastructure/SCHEMA_SEPARATION.md)

## 🛠️ 자주 사용하는 명령어

```bash
# 개발
pnpm start:dev          # 개발 서버 시작
pnpm build              # 빌드
pnpm lint               # 린트

# 데이터베이스
pnpm db:setup           # DB 전체 설정
pnpm db:migrate         # 개발 DB 마이그레이션
pnpm db:studio          # Prisma Studio 열기

# Docker
pnpm docker:up          # Docker 서비스 시작
pnpm docker:down        # Docker 서비스 중지
pnpm docker:logs        # 로그 확인

# 테스트
pnpm test               # 단위 테스트
pnpm test:e2e           # E2E 테스트
pnpm test:cov           # 커버리지
```

## 🔗 접속 정보

| 서비스 | URL | 설명 |
|--------|-----|------|
| API Server | http://localhost:3000 | 메인 API |
| Swagger | http://localhost:3000/api/docs | API 문서 |
| Prisma Studio | http://localhost:5555 | DB GUI (dev) |
| pgAdmin | http://localhost:5050 | DB 관리 도구 |

## 💻 개발 워크플로우

1. **매일 시작**
   ```bash
   pnpm db:start && pnpm start:dev
   ```

2. **DB 스키마 변경 시**
   ```bash
   cd ../../packages/prisma
   pnpm prisma migrate dev --name your_change_name
   cd ../../apps/inquaire-api-server
   pnpm db:migrate:test  # 테스트 DB에도 적용
   ```

3. **테스트 실행**
   ```bash
   pnpm db:migrate:test  # 테스트 DB 준비
   pnpm test:e2e         # E2E 테스트
   ```

## 🏗️ 기술 스택

- **Framework**: NestJS
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Queue**: BullMQ
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Monitoring**: Prometheus, Grafana

## 📝 기여하기

기여 가이드는 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 📖 더 알아보기

- [API 마이그레이션 가이드](API_MIGRATION.md)
- [변경 이력](CHANGELOG.md)
- [프로젝트 루트 README](../../README.md)
