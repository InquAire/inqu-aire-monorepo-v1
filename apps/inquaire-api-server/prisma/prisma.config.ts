import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { defineConfig, env } from 'prisma/config';

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PACKAGE_DIR = __dirname;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

// 환경 변수 파일 로딩 순서
// dotenv는 이미 설정된 환경 변수를 덮어쓰지 않으므로, 우선순위가 높은 파일을 먼저 로드
const envCandidates = [
  // 1. 기본 파일들 (낮은 우선순위) - 먼저 로드
  path.join(ROOT_DIR, '.env'),
  path.join(PACKAGE_DIR, '.env'),
  // 2. 환경별 파일들 (높은 우선순위) - NODE_ENV에 따라, 나중에 로드하여 덮어쓰기
  path.join(ROOT_DIR, `.env.${NODE_ENV}`),
  path.join(PACKAGE_DIR, `.env.${NODE_ENV}`),
  // 3. 로컬 오버라이드 파일들 (가장 높은 우선순위) - 가장 나중에 로드
  path.join(ROOT_DIR, '.env.local'),
  path.join(ROOT_DIR, `.env.${NODE_ENV}.local`),
  path.join(PACKAGE_DIR, `.env.${NODE_ENV}.local`),
];

// 역순으로 로드하여 우선순위가 높은 파일이 나중에 로드되도록
// 하지만 dotenv는 이미 설정된 값을 덮어쓰지 않으므로, override 옵션 사용
for (const candidate of envCandidates) {
  if (!fs.existsSync(candidate)) continue;
  const parsed = loadDotenv({ path: candidate, override: true });
  dotenvExpand.expand(parsed);
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx ./seed/index.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
