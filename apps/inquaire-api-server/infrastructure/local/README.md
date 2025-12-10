# Infra (Local Dev)

## 구성

- **Postgres 17**: 메인 데이터베이스 (슬로우 쿼리 로깅, pg_stat_statements, pg_trgm)
- **Redis 8**: 캐싱 및 Rate Limiting
- **LocalStack 4.6**: S3, SQS 에뮬레이션 (로컬 개발용)
- **Mailpit**: SMTP 서버 및 이메일 UI (로컬 개발용)

## 시작하기

### 1. 환경 변수 설정

`infrastructure/local` 디렉토리에 `.env` 파일을 생성하고 다음 변수들을 설정하세요:

```bash
# Docker Compose 서비스 포트
POSTGRES_PORT=5432
REDIS_PORT=6379
REDIS_PASSWORD=redispass
LOCALSTACK_PORT=4566
MAILHOG_SMTP_PORT=1025
MAILHOG_UI_PORT=8025

# PostgreSQL 설정
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=test
```

### 2. API 서버 환경 변수 설정

`apps/api-server/envs/` 디렉토리에 `.env.development.local` 파일을 생성하고 다음 변수들을 설정하세요:

```bash
# Node Environment
NODE_ENV=development

# Server Port
PORT=3000

# Database (docker-compose.yml의 postgres 서비스와 연결)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test?schema=inquaire

# Redis (옵션, Rate Limiting 사용 시)
REDIS_URL=redis://:redispass@localhost:6379

# S3 / LocalStack (필수)
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:4566
S3_BUCKET=inquaire-korean-bucket
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# JWT (필수, 최소 16자 이상)
JWT_ACCESS_SECRET=your-super-secret-jwt-key-min-16-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# YouTube API (필수)
YOUTUBE_API_KEY=your-youtube-api-key

# Android (필수)
ANDROID_PACKAGE_IDENTIFIER=com.yourcompany.app

# HTTP / Security
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
TRUST_PROXY=false

# Logging
PK_LOG_LEVEL=debug
PK_LOG_PRETTY=true

# Google OAuth (옵션)
# GOOGLE_CLIENT_ID=your-google-client-id

# Apple OAuth (옵션)
# APPLE_CLIENT_ID=your-apple-client-id
```

### 3. 서비스 시작

```bash
cd infrastructure/local
docker-compose up -d
```

### 4. 서비스 상태 확인

```bash
# 모든 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f [service-name]

# 개별 서비스 로그
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f localstack
docker-compose logs -f mailpit
```

### 5. LocalStack 초기화 확인

LocalStack이 시작되면 자동으로 `bootstrap.sh` 스크립트가 실행되어 다음 리소스들이 생성됩니다:

- **S3 버킷**: `content`, `pk-assets-tmp`, `pk-assets-processed`, `pk-audio`, `pk-images`, `inquaire-korean-bucket`
- **SQS 큐**: `pk-jobs` (DLQ: `pk-dead-letter`)

### 6. 서비스 접속 정보

- **PostgreSQL**: `localhost:5432`
  - 사용자: `postgres`
  - 비밀번호: `postgres`
  - 데이터베이스: `test`
- **Redis**: `localhost:6379` (password: `redispass`)
- **LocalStack**: `http://localhost:4566`
- **Mailpit UI**: `http://localhost:8025`
- **Mailpit SMTP**: `localhost:1025`

## 서비스 중지

```bash
# 서비스 중지 (컨테이너 유지)
docker-compose stop

# 서비스 중지 및 컨테이너 제거
docker-compose down

# 볼륨까지 삭제 (데이터 초기화)
docker-compose down -v
```

## 문제 해결

### PostgreSQL 연결 실패

```bash
# PostgreSQL 로그 확인
docker-compose logs postgres

# 컨테이너 재시작
docker-compose restart postgres
```

### LocalStack S3 버킷이 생성되지 않음

```bash
# LocalStack 로그 확인
docker-compose logs localstack

# bootstrap 스크립트 수동 실행
docker-compose exec localstack bash /etc/localstack/init/ready.d/bootstrap.sh
```

### Redis 연결 실패

```bash
# Redis 로그 확인
docker-compose logs redis

# Redis 클라이언트로 테스트
docker-compose exec redis redis-cli ping
```

## 주의사항

1. **환경 변수 우선순위**: API 서버는 `apps/api-server/envs/.env.development.local` 파일의 환경 변수를 사용합니다. 이 파일이 `.env.development`보다 우선순위가 높습니다.

2. **데이터베이스 마이그레이션**: 서비스 시작 후 Prisma 마이그레이션을 실행하세요:

   ```bash
   cd packages/prisma
   pnpm prisma migrate dev
   ```

3. **S3 버킷**: LocalStack은 시작 시 자동으로 버킷을 생성하지만, 수동으로 생성하려면:

   ```bash
   aws --endpoint-url=http://localhost:4566 s3 mb s3://your-bucket-name
   ```

4. **포트 충돌**: 이미 사용 중인 포트가 있다면 `.env` 파일에서 포트를 변경하세요.
