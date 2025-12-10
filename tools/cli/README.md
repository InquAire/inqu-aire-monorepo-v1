# ai-cli - 통합 명령줄 도구

서버 모노레포를 위한 통합 명령줄 도구입니다. 개발, 배포, 데이터베이스 관리, OpenAPI 생성 등 다양한 작업을 간편하게 수행할 수 있습니다.

## 🚀 주요 기능

### **AI 문의 분석**

- **문의 분석**: OpenAI GPT-4o-mini를 사용한 고객 문의 자동 분석
- **자동 답변 생성**: 업종별 맞춤 답변 자동 생성
- **문의 분류**: 문의 유형 자동 분류 (예약, 가격, 일반 등)
- **샘플 테스트**: 업종별 샘플 데이터로 AI 성능 테스트

### **환경변수 관리**

- **자동 병합**: `.env`, `.env.local`, `.env.{NODE_ENV}` 파일 자동 로드
- **민감 정보 마스킹**: SECRET, PASSWORD, KEY, TOKEN 패턴 자동 마스킹
- **필수 키 검증**: 필수 환경변수 누락 검사

### **데이터베이스 관리**

- **Prisma 마이그레이션**: `migrate deploy`, `migrate dev` 실행
- **클라이언트 생성**: Prisma 클라이언트 자동 생성
- **데이터베이스 초기화**: 리셋, 시드, Studio 실행

### **OpenAPI 도구**

- **스키마 검증**: Swagger CLI를 통한 API 명세 검증
- **번들링**: 분할된 OpenAPI 파일을 단일 파일로 통합
- **타입 생성**: TypeScript 타입 정의 자동 생성
- **클라이언트 생성**: API 클라이언트 코드 자동 생성

### **로컬 인프라 관리**

- **Docker Compose**: 서비스 시작/중지/로그 모니터링
- **스마트 경로 탐지**: 자동으로 인프라 디렉토리 찾기
- **프로파일 지원**: 다양한 환경별 설정 지원

### **배스천 터널 관리**

- **SSM 포트포워딩 제어**: AWS Systems Manager를 이용한 터널 start/stop/status
- **다중 터널**: 설정 파일에 정의된 여러 터널을 일괄 제어
- **로그/런타임 관리**: 자동으로 PID/로그 디렉터리 생성 및 상태 확인

### **부트스트랩 (Bootstrap)**

- **초기화 일괄 실행**: `@ai-next/shared` 빌드 → Prisma generate/build → CLI 빌드
- 의존성 설치는 선행 필요: `pnpm install`

## 📦 설치 및 빌드

### **의존성 설치**

```bash
pnpm install
```

### **빌드**

```bash
pnpm build
```

### **개발 모드 실행**

```bash
pnpm dev
```

## 🛠️ 사용법

### **기본 명령어**

```bash
# 도움말 보기
ai --help

# 버전 확인
ai --version

# 특정 명령어 도움말
ai ai --help
ai env --help
ai db --help
ai openapi --help
ai stack --help
```

### **AI 문의 분석 (`ai`)**

#### **환경 설정**

먼저 OpenAI API Key를 환경변수로 설정하세요:

```bash
export OPENAI_API_KEY="sk-your-openai-api-key"
```

또는 `.env` 파일에 추가:

```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

#### **문의 분석**

```bash
# 직접 메시지 입력
ai ai analyze --message "안녕하세요. 다음주 화요일에 스케일링 예약 가능한가요?"

# 파일에서 메시지 읽기
ai ai analyze --file inquiry.txt

# 업종 지정 (병원)
ai ai analyze --message "쌍꺼풀 수술 상담 예약하고 싶습니다" --industry PLASTIC_SURGERY

# 부동산 업종
ai ai analyze --message "강남구 아파트 전세 3억 정도 찾고 있습니다" --industry REAL_ESTATE
```

**출력 예시:**

```
📋 문의 분석 중...

업종: HOSPITAL
메시지: 안녕하세요. 다음주 화요일에 스케일링 예약 가능한가요?

✅ 분석 완료

처리 시간: 1234ms
문의 유형: 예약 문의
요약: 다음주 화요일 스케일링 예약 문의
감정: positive
긴급도: medium
신뢰도: 0.95

추출 정보:
{
  "desired_date": "2025-11-19",
  "desired_time": "미지정",
  "treatment_name": "스케일링",
  "customer_name": null,
  "contact": null
}

추천 답변:
네, 다음주 화요일 스케일링 예약 가능합니다. 오전과 오후 중 선호하시는 시간대를 알려주시면 예약 도와드리겠습니다.
```

#### **자동 답변 생성**

```bash
# 기본 답변 생성
ai ai reply --message "임플란트 비용이 어떻게 되나요?"

# 컨텍스트와 함께 답변 생성
ai ai reply \
  --message "가격이 너무 비싼 것 같은데요" \
  --context "이전 문의: 임플란트 비용 문의, 답변: 개당 150만원입니다" \
  --industry DENTAL
```

**출력 예시:**

```
💬 답변 생성 중...

업종: DENTAL
메시지: 임플란트 비용이 어떻게 되나요?

✅ 답변 생성 완료

답변:
안녕하세요. 임플란트 비용은 개당 약 120만원~150만원이며, 정확한 비용은 상담 후 안내드리고 있습니다. 방문 상담 예약을 도와드릴까요?
```

#### **문의 분류**

```bash
# 문의 유형 자동 분류
ai ai classify --message "치아가 너무 아파서 급한데 오늘 진료 가능한가요?"
```

**출력 예시:**

```
🏷️  문의 분류 중...

메시지: 치아가 너무 아파서 급한데 오늘 진료 가능한가요?

✅ 분류 완료

분류 결과: 긴급
```

#### **샘플 테스트**

업종별 샘플 데이터로 AI 성능을 일괄 테스트:

```bash
# 병원 샘플 테스트
ai ai test --industry HOSPITAL

# 부동산 샘플 테스트
ai ai test --industry REAL_ESTATE

# 성형외과 샘플 테스트
ai ai test --industry PLASTIC_SURGERY
```

**출력 예시:**

```
🧪 샘플 테스트 시작

업종: HOSPITAL

━━━ 샘플 1/3 ━━━
문의: 안녕하세요. 다음주 화요일에 스케일링 예약 가능한가요? 오전 시간대로 부탁드립니다.

유형: 예약 문의
요약: 다음주 화요일 오전 스케일링 예약 요청
긴급도: medium
답변: 네, 다음주 화요일 오전 스케일링 예약 가능합니다...

━━━ 샘플 2/3 ━━━
...
```

#### **시스템 프롬프트 확인**

현재 사용 중인 AI 시스템 프롬프트를 확인:

```bash
# 병원 프롬프트 확인
ai ai prompt --industry HOSPITAL

# 부동산 프롬프트 확인
ai ai prompt --industry REAL_ESTATE
```

#### **지원하는 업종 (Industry Types)**

- `HOSPITAL` - 병원/의원 (기본값)
- `DENTAL` - 치과
- `DERMATOLOGY` - 피부과
- `PLASTIC_SURGERY` - 성형외과
- `REAL_ESTATE` - 부동산

### **환경변수 관리 (`env`)**

#### **환경변수 출력**

```bash
# 모든 환경변수 출력 (민감 정보 마스킹)
ai env

# 또는 명시적으로
ai env print
```

**출력 예시:**

```
• Effective ENV (merged):
DATABASE_URL=postgresql://user:pass@localhost:5432/db
NODE_ENV=development
ai_DB_SLOW_MS=200
SECRET_KEY=***
JWT_SECRET=***
```

#### **필수 환경변수 검증**

```bash
# 전체(기본)
ai env --check

# 타깃별 검사
ai env --check --target api
ai env --check --target prisma
```

**검증 대상:**

- `--target prisma`: `NODE_ENV`, `DATABASE_URL`, `ai_DB_STMT_TIMEOUT_MS`, `ai_DB_SLOW_MS`, `ai_DB_DEADLOCK_RETRY`
- `--target api`: 전체 API 스키마(예: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `ai_LOG_*`, `RATE_*`, 등)

**검증 실패 시:**

```bash
Missing required env: DATABASE_URL
# 프로세스 종료 (exit code 1)
```

### **데이터베이스 관리 (`db`)**

#### **기본 마이그레이션**

```bash
# 기본 마이그레이션 (deploy)
ai db

# 또는 명시적으로
ai db migrate
```

#### **개발용 마이그레이션**

```bash
# 새 마이그레이션 생성 (이름 필수)
ai db create --name add_user_profile

# 로컬 DB에 즉시 적용하며 생성
ai db dev --name add_user_profile
```

#### **Prisma 클라이언트 생성**

```bash
ai db generate
```

#### **데이터베이스 초기화**

```bash
# ⚠️ 주의: 모든 데이터가 삭제됩니다
ai db reset
```

#### **Prisma Studio 실행**

```bash
# 데이터베이스 GUI 도구 실행
ai db studio
```

#### **시드 데이터 삽입**

```bash
ai db seed
```

### **OpenAPI 도구 (`openapi`)**

InquAire API Server의 OpenAPI 문서를 생성하고 관리합니다.

#### **전체 작업 실행**

```bash
# 생성 + 검증
ai openapi

# 또는 명시적으로
ai openapi all
```

**출력 예시:**

```
📚 InquAire API Server - OpenAPI 문서 관리

━━━ OpenAPI 문서 생성 ━━━

✅ OpenAPI JSON 생성 완료: /path/to/docs/api/openapi.json

생성된 파일:
  - openapi.json
  - openapi-v0.1.0.json
  - openapi-2025-11-16.json

━━━ OpenAPI 문서 검증 ━━━

✅ OpenAPI 문서 검증 완료

✅ OpenAPI 작업 완료!

다음 단계:
  - Swagger UI 확인: ai openapi serve
  - JSON 파일 위치: docs/api/openapi.json
```

#### **개별 작업 실행**

```bash
# OpenAPI JSON 생성만
ai openapi generate

# OpenAPI 문서 검증만
ai openapi validate

# Swagger UI 서버 실행
ai openapi serve
```

#### **Swagger UI 사용**

```bash
# 개발 서버 실행 (Swagger UI 포함)
ai openapi serve
```

서버 실행 후 접속:

- **Swagger UI**: http://localhost:3000/api/docs
- **API 엔드포인트**: http://localhost:3000/api

#### **생성된 파일**

OpenAPI 문서는 `apps/inquaire-api-server/docs/api/` 디렉토리에 생성됩니다:

- `openapi.json` - 최신 버전
- `openapi-v{version}.json` - 버전별 아카이브
- `openapi-{date}.json` - 날짜별 스냅샷

#### **클라이언트 SDK 생성**

생성된 OpenAPI JSON으로 클라이언트 SDK를 자동 생성할 수 있습니다:

```bash
# TypeScript/Axios 클라이언트
npx @openapitools/openapi-generator-cli generate \
  -i apps/inquaire-api-server/docs/api/openapi.json \
  -g typescript-axios \
  -o clients/typescript

# Python 클라이언트
npx @openapitools/openapi-generator-cli generate \
  -i apps/inquaire-api-server/docs/api/openapi.json \
  -g python \
  -o clients/python
```

### **로컬 인프라 관리 (`stack`)**

#### **Docker 서비스 시작**

```bash
# 백그라운드에서 서비스 시작
ai stack

# 또는 명시적으로
ai stack up
```

#### **Docker 서비스 중지**

```bash
ai stack down
```

#### **로그 모니터링**

```bash
# 실시간 로그 확인
ai stack logs

# 특정 서비스 로그만
ai stack logs --service redis --service postgres
```

#### **고급 옵션**

```bash
# 특정 compose 파일 사용
ai stack up --file docker-compose.prod.yml

# 프로파일 지정
ai stack up --profile production

# 특정 서비스만 시작
ai stack up --service redis --service postgres

# 상세 정보 출력
ai stack up --verbose
```

### **배스천 터널 관리 (`bastion`)**

AWS Systems Manager(Session Manager)를 이용해 배스천 터널을 시작·중지·상태 확인합니다. 기본 설정 파일은 저장소의 `packages/cli/config/bastion-tunnels.conf`이며, 서버 전역 설정(`/etc/bastion/tunnels.conf`)도 그대로 사용할 수 있습니다.

```bash
# 기본 동작: 상태 확인
ai bastion

# 터널 제어
ai bastion start
ai bastion stop
ai bastion restart

# 커스텀 설정/디렉터리 지정
ai bastion start --config ./scripts/bastion/tunnels.conf \
  --runtime-dir ~/.cache/bastion/run \
  --log-dir ~/.cache/bastion/log
```

**주요 환경 변수**

- `CONFIG_FILE`: 설정 파일 경로 (기본 `tools/cli/config/bastion-tunnels.conf`, 없으면 `/etc/bastion/tunnels.conf`)
- `RUNTIME_DIR`: PID 파일 저장 위치 (기본 `~/.cache/bastion-tunnels/run`)
- `LOG_DIR`: 로그 파일 저장 위치 (기본 `~/.cache/bastion-tunnels/log`)
- `BASTION_TARGET`, `AWS_PROFILE`, `AWS_REGION`: 설정 파일 값을 일시적으로 덮어쓸 때 사용

**Read Replica 사용하기**

프로덕션 설정 파일(`bastion-tunnels-production.conf`)에는 Read Replica 터널이 포함되어 있습니다:

- **Write DB**: `localhost:45432` → `DATABASE_URL`
- **Read Replica**: `localhost:25432` → `READ_DATABASE_URL`
- **Redis**: `localhost:16379` → `REDIS_URL`

로컬 개발 환경에서 Read Replica를 사용하려면:

1. **터널 시작**:

   ```bash
   BASTION_ENV=production ai bastion start
   ```

2. **환경 변수 설정** (`apps/api-server/envs/.env.local` 또는 환경 변수):

   ```bash
   # Write DB (필수)
   DATABASE_URL=postgresql://user:password@localhost:45432/dbname

   # Read Replica (선택적, 터널이 연결된 경우)
   READ_DATABASE_URL=postgresql://user:password@localhost:25432/dbname
   ```

3. **애플리케이션에서 사용**:

   ```typescript
   // 읽기 작업: Read Replica 사용 (설정된 경우)
   const users = await prisma.read.user.findMany();

   // 쓰기 작업: Write DB 사용
   const user = await prisma.write.user.create({ data: {...} });
   ```

설정 템플릿과 예시는 `deploy/api-server/README.md`의 시크릿/환경 변수 안내를 참고하세요.

### **부트스트랩 실행 (`bootstrap`)**

```bash
# 의존성 설치 후 초기 빌드/생성 작업 일괄 수행
ai bootstrap
```

**수행 항목:**

- `@ai-next/shared` 빌드
- `@ai-next/prisma` 클라이언트 생성 (`prisma generate`)
- `@ai-next/prisma` 빌드
- `ai-cli` 빌드

## 🔧 상세 API 문서

### **1. 메인 CLI 진입점**

#### **명령어 구조**

```typescript
// packages/cli/src/index.ts
const program = new Command();
program.name('ai')
  .description('InquAire Monorepo CLI')
  .version('0.1.0');

// 하위 명령어 등록
program.command('env')...
program.command('db')...
program.command('openapi')...
program.command('stack')...
```

#### **에러 처리**

```typescript
program.parseAsync().catch(e => {
  console.error(e);
  process.exit(1);
});
```

### **2. 환경변수 명령어 (`env`)**

#### **명령어 옵션**

```typescript
program
  .command('env')
  .description('환경변수 유틸리티')
  .option('-c, --check', '필수 키 검사')
  .action(async opts => {
    await cmdEnv(opts.check ? 'check' : 'print');
  });
```

#### **동작 모드**

- **`print` (기본)**: 병합된 환경변수 출력
- **`check`**: 필수 환경변수 누락 검사

#### **민감 정보 마스킹**

```typescript
const masked = /SECRET|PASSWORD|KEY|TOKEN/i.test(k) ? '***' : v;
```

**마스킹 패턴:**

- `SECRET` - 시크릿 키
- `PASSWORD` - 비밀번호
- `KEY` - 암호화 키
- `TOKEN` - 인증 토큰

### **3. 데이터베이스 명령어 (`db`)**

#### **지원하는 액션**

```typescript
type DbAction = 'migrate' | 'generate' | 'reset' | 'studio' | 'seed' | 'dev';
```

#### **명령어 옵션**

```typescript
program
  .command('db')
  .description('Prisma DB 작업')
  .argument('[action]', 'migrate|generate|reset|studio|seed|dev', 'migrate')
  .option('--name <name>', 'migrate dev name')
  .action(async (action, options) => {
    await cmdDb(action, options);
  });
```

#### **각 액션별 동작**

```typescript
export async function cmdDb(action: DbAction = 'migrate', opts?: { name?: string }) {
  const cwd = aiG_PRISMA;

  switch (action) {
    case 'dev':
      const args = ['prisma', 'migrate', 'dev'];
      if (opts?.name) args.push('--name', opts.name);
      await sh('pnpm', args, { cwd });
      break;
    case 'migrate':
      await sh('pnpm', ['prisma', 'migrate', 'deploy'], { cwd });
      break;
    case 'generate':
      await sh('pnpm', ['prisma', 'generate'], { cwd });
      break;
    case 'reset':
      await sh('pnpm', ['prisma', 'migrate', 'reset'], { cwd });
      break;
    case 'studio':
      await sh('pnpm', ['prisma', 'studio'], { cwd });
      break;
    case 'seed':
      await sh('pnpm', ['run', 'seed'], { cwd });
      break;
  }
}
```

### **4. OpenAPI 명령어 (`openapi`)**

#### **지원하는 액션**

```typescript
type OpenapiAction = 'validate' | 'bundle' | 'types' | 'client' | 'all';
```

#### **검증 (Validation)**

```typescript
if (action === 'validate' || action === 'all') {
  await sh(
    'pnpm',
    ['-w', 'exec', 'npx', '-y', '@apidevtools/swagger-cli@4.0.4', 'validate', OPENAPI_ROOT],
    { cwd: ROOT }
  );
}
```

**사용 도구**: `@apidevtools/swagger-cli@4.0.4`
**검증 대상**: `apps/api/openapi/root.yaml`

#### **번들링 (Bundling)**

```typescript
if (action === 'bundle' || action === 'all') {
  await sh(
    'pnpm',
    [
      '-w',
      'exec',
      'npx',
      '-y',
      '@apidevtools/swagger-cli@4.0.4',
      'bundle',
      OPENAPI_ROOT,
      '--type',
      'yaml',
      '-o',
      OPENAPI_BUNDLE_OUT,
    ],
    { cwd: ROOT }
  );
}
```

**입력**: `apps/api/openapi/root.yaml`
**출력**: `apps/api/openapi.yaml`

#### **타입 생성 (Types)**

```typescript
if (action === 'types' || action === 'all') {
  await sh('pnpm', ['--filter', '@ai-next/api', 'run', 'gen:openapi:types'], { cwd: ROOT });
}
```

**실행**: `@ai-next/api` 패키지의 `gen:openapi:types` 스크립트

#### **클라이언트 생성 (Client)**

```typescript
if (action === 'client' || action === 'all') {
  await sh('pnpm', ['--filter', '@ai-next/api', 'run', 'gen:openapi:client'], { cwd: ROOT });
}
```

**실행**: `@ai-next/api` 패키지의 `gen:openapi:client` 스크립트

### **5. 스택 명령어 (`stack`)**

#### **지원하는 액션**

```typescript
type StackAction = 'up' | 'down' | 'logs';
```

#### **명령어 옵션**

```typescript
program
  .command('stack')
  .description('로컬 인프라(docker compose) - infrastructure/local 기준')
  .argument('[action]', 'up|down|logs', 'up')
  .option('-f, --file <path...>', 'compose 파일 경로(다중 지정 가능)')
  .option('-p, --profile <name...>', 'compose profile')
  .option('-s, --service <name...>', '특정 서비스만 대상')
  .action(async (action, opts) => {
    await cmdStack(action, opts);
  });
```

#### **워킹 디렉토리 탐지**

```typescript
function resolveCwd(): string {
  // 1) 환경변수 override
  const fromEnv = process.env.ai_INFRA_DIR;
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);

  // 2) 실행 위치로부터 루트 탐지 → infrastructure/local
  const repoRoot = findRepoRoot(process.cwd());
  const infra = path.join(repoRoot, 'infrastructure', 'local');
  if (fs.existsSync(infra)) return infra;

  // 3) 기존 상수 fallback
  if (fs.existsSync(aiG_INFRA)) return aiG_INFRA;

  // 4) 최후 루트
  return ROOT;
}
```

**탐지 우선순위:**

1. `ai_INFRA_DIR` 환경변수
2. `infrastructure/local` 디렉토리
3. 상수 `aiG_INFRA`
4. 루트 디렉토리

#### **Compose 파일 탐지**

```typescript
function findComposeFiles(cwd: string, specified?: string | string[]) {
  if (specified && arr(specified).length) return arr(specified);
  const cands = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];
  return cands.filter(f => fs.existsSync(path.join(cwd, f)));
}
```

**지원 파일 형식:**

- `compose.yaml` (최신)
- `compose.yml`
- `docker-compose.yaml`
- `docker-compose.yml`

#### **Docker Compose 명령어 구성**

```typescript
const base = [
  'compose',
  ...files.flatMap(f => ['-f', f]),
  ...arr(opts.profile).flatMap(p => ['--profile', p]),
];

// up: 백그라운드 시작
await sh('docker', [...base, 'up', '-d', ...services], { cwd });

// down: 서비스 중지
await sh('docker', [...base, 'down'], { cwd });

// logs: 실시간 로그
await sh('docker', [...base, 'logs', '-f', ...services], { cwd });
```

### **6. 유틸리티 함수들**

#### **환경변수 로딩 (`env.ts`)**

```typescript
export function loadEnvMerged(cwd: string, nodeEnv = process.env.NODE_ENV ?? 'development'): Dict {
  const files = [
    '.env', // 기본
    '.env.local', // 로컬 오버라이드
    `.env.${nodeEnv}`, // 환경별
    `.env.${nodeEnv}.local`, // 환경별 로컬
  ].map(f => path.join(cwd, f));

  const merged: Dict = {};
  // 파일 순서대로 병합 (나중 것이 우선)
  for (const f of files) Object.assign(merged, loadFile(f));
  // process.env 최우선
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') merged[k] = v;
  }
  return merged;
}
```

**환경변수 우선순위:**

1. `.env` (기본)
2. `.env.local` (로컬 오버라이드)
3. `.env.{NODE_ENV}` (환경별)
4. `.env.{NODE_ENV}.local` (환경별 로컬)
5. `process.env` (시스템 환경변수, 최우선)

#### **경로 상수 (`paths.ts`)**

```typescript
// 동적으로 계산 (전역 링크/로컬 실행 모두 커버)
export const ROOT = findRepoRoot(process.cwd());
export const aiG_API = path.join(ROOT, 'apps', 'api-server');
export const aiG_PRISMA = path.join(ROOT, 'packages', 'prisma');
export const aiG_SHARED = path.join(ROOT, 'packages', 'shared');
export const aiG_INFRA = path.join(ROOT, 'infrastructure', 'local');

export const OPENAPI_ROOT = path.join(aiG_API, 'openapi', 'root.yaml');
export const OPENAPI_BUNDLE_OUT = path.join(aiG_API, 'openapi.yaml');
```

#### **명령어 실행 (`exec.ts`)**

```typescript
export async function sh(
  cmd: string,
  args: string[],
  opts: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {}
) {
  const c = await execa(cmd, args, {
    stdio: opts.stdio ?? 'inherit',
    cwd: opts.cwd,
  });
  return c.exitCode;
}
```

**특징:**

- **`execa` 사용**: Node.js의 `child_process` 대신 더 강력한 `execa` 사용
- **기본 stdio**: `inherit`으로 설정하여 실시간 출력
- **워킹 디렉토리**: `cwd` 옵션으로 실행 위치 제어

## 🎯 사용 시나리오

### **1. 개발 환경 초기 설정**

```bash
# 1. 환경변수 확인
ai env --check

# 2. 로컬 인프라 시작
ai stack up

# 3. 데이터베이스 마이그레이션
ai db migrate

# 4. Prisma 클라이언트 생성
ai db generate

# 5. 시드 데이터 삽입
ai db seed
```

### **2. API 개발 워크플로우**

```bash
# 1. OpenAPI 스키마 검증
ai openapi validate

# 2. 스키마 번들링
ai openapi bundle

# 3. 타입 생성
ai openapi types

# 4. 클라이언트 생성
ai openapi client
```

### **3. 데이터베이스 스키마 변경**

```bash
# 1. 새 마이그레이션 생성
ai db create --name add_user_profile

# 2. (선택) 로컬 DB에 즉시 적용하며 생성
ai db dev --name add_user_profile

# 3. 마이그레이션 적용
ai db migrate

# 4. 클라이언트 재생성
ai db generate

# 5. Prisma Studio로 데이터 확인
ai db studio
```

### **4. 로컬 인프라 관리**

```bash
# 1. 특정 프로파일로 서비스 시작
ai stack up --profile development

# 2. 특정 서비스만 시작
ai stack up --service redis --service postgres

# 3. 로그 모니터링
ai stack logs --service api

# 4. 서비스 중지
ai stack down
```

### **5. 프로덕션 배포 전 준비**

```bash
# 1. 환경변수 검증
ai env --check

# 2. 데이터베이스 마이그레이션
ai db migrate

# 3. OpenAPI 검증
ai openapi validate

# 4. 타입 및 클라이언트 생성
ai openapi all
```

## ⚠️ 주의사항

### **데이터베이스 작업**

- **`ai db reset`**: **모든 데이터를 삭제**합니다
- **프로덕션 환경**: 절대 사용하지 마세요
- **실행 전**: 백업을 권장합니다

### **환경변수**

- **민감한 정보**: `.env.local`에 저장하세요
- **`.env.local`**: `.gitignore`에 포함되어야 합니다
- **프로덕션**: 별도 관리 시스템을 사용하세요

### **Docker Compose**

- **`ai stack`**: 루트 디렉토리의 `docker-compose.yml`을 사용합니다
- **필요한 서비스**: 정의되어 있는지 확인하세요
- **경로 탐지**: `ai_INFRA_DIR` 환경변수로 오버라이드 가능

### **OpenAPI**

- **의존성**: `@ai-next/api` 패키지의 스크립트에 의존합니다
- **스키마 검증**: `@apidevtools/swagger-cli` 필요합니다
- **파일 경로**: `apps/api/openapi/root.yaml` 기준입니다

## 🔗 관련 링크

- [Commander.js](https://github.com/tj/commander.js) - CLI 프레임워크
- [Prisma](https://www.prisma.io/) - 데이터베이스 ORM
- [OpenAPI](https://swagger.io/specification/) - API 명세
- [Docker Compose](https://docs.docker.com/compose/) - 컨테이너 오케스트레이션
- [dotenv](https://github.com/motdotla/dotenv) - 환경변수 관리
- [execa](https://github.com/sindresorhus/execa) - 프로세스 실행

## 📝 라이센스

ISC

---

**개발팀**: InquAire Team  
**버전**: 0.1.0  
**최종 업데이트**: 2024년
