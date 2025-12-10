import fs from 'node:fs';
import path from 'node:path';

const ROOT_MARKERS = ['pnpm-workspace.yaml', 'package.json', '.git'];

export function isRepoRoot(dir: string): boolean {
  // 최소 조건: infrastructure/local 가 있거나, 워크스페이스/깃 마커가 존재
  const hasInfra = fs.existsSync(path.join(dir, 'infrastructure', 'local'));
  const hasMarker = ROOT_MARKERS.some(m => fs.existsSync(path.join(dir, m)));
  return hasInfra || hasMarker;
}

export function findRepoRoot(start = process.cwd()): string {
  let dir = path.resolve(start);
  while (true) {
    if (isRepoRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // 최후 fallback: 현재 실행 위치
  return path.resolve(start);
}

// 동적으로 계산 (전역 링크/로컬 실행 모두 커버)
export const ROOT = findRepoRoot(process.cwd());
// InquAire API Server
export const PKG_API = path.join(ROOT, 'apps', 'inquaire-api-server');
export const PKG_PRISMA = path.join(ROOT, 'apps', 'inquaire-api-server'); // Prisma is now in api-server
export const PKG_SHARED = path.join(ROOT, 'packages', 'shared');
export const PKG_INFRA = path.join(ROOT, 'infrastructure', 'local');

// OpenAPI paths for InquAire API Server
export const OPENAPI_DOCS_DIR = path.join(PKG_API, 'docs', 'api');
export const OPENAPI_JSON = path.join(OPENAPI_DOCS_DIR, 'openapi.json');
export const OPENAPI_SCRIPT = path.join(PKG_API, 'scripts', 'generate-openapi.ts');

export function ensureExists(p: string) {
  if (!fs.existsSync(p)) throw new Error(`Path not found: ${p}`);
}
