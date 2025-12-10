import fs from 'node:fs';
import path from 'node:path';

import { sh } from '../utils/exec';
import { PKG_INFRA, ROOT, findRepoRoot } from '../utils/paths';

type StackAction = 'up' | 'down' | 'logs';
type StackOpts = {
  file?: string | string[];
  profile?: string | string[];
  service?: string | string[];
  verbose?: boolean;
  volumes?: boolean;
  removeOrphans?: boolean;
};

const arr = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);

function resolveCwd(): string {
  // 1) 환경변수 override
  const fromEnv = process.env.PK_INFRA_DIR;
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);

  // 2) 실행 위치로부터 루트 탐지 → infrastructure/local
  const repoRoot = findRepoRoot(process.cwd());
  const infra = path.join(repoRoot, 'infrastructure', 'local');
  if (fs.existsSync(infra)) return infra;

  // 3) API server infra directory
  const apiInfra = path.join(repoRoot, 'apps', 'inquaire-api-server', 'infra', 'docker');
  if (fs.existsSync(apiInfra)) return apiInfra;

  // 4) 기존 상수 fallback
  if (fs.existsSync(PKG_INFRA)) return PKG_INFRA;

  // 5) 최후 루트
  return ROOT;
}

function findComposeFiles(cwd: string, specified?: string | string[]) {
  if (specified && arr(specified).length) return arr(specified);
  const cands = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];
  return cands.filter(f => fs.existsSync(path.join(cwd, f)));
}

export async function cmdStack(action: StackAction = 'up', opts: StackOpts = {}) {
  const cwd = resolveCwd();
  const files = findComposeFiles(cwd, opts.file);
  if (!files.length) {
    throw new Error(
      `No compose file found under: ${cwd}\n` +
        `→ Put one of [compose.yaml|compose.yml|docker-compose.yaml|docker-compose.yml]\n` +
        `→ or pass -f/--file explicitly (relative to ${cwd} or absolute)\n` +
        `→ or set PK_INFRA_DIR=/path/to/infra`
    );
  }

  const base = [
    'compose',
    ...files.flatMap(f => ['-f', f]),
    ...arr(opts.profile).flatMap(p => ['--profile', p]),
  ];
  const services = arr(opts.service);

  if (opts.verbose) {
    console.log({ cwd, files, base, action, services, ROOT });
  }

  if (action === 'up') {
    await sh('docker', [...base, 'up', '-d', ...services], { cwd });
    return;
  }
  if (action === 'down') {
    const downCmd = [...base, 'down'];
    if (opts.removeOrphans) {
      downCmd.push('--remove-orphans');
    }
    if (opts.volumes) {
      downCmd.push('--volumes');
    }
    await sh('docker', downCmd, { cwd });
    return;
  }
  if (action === 'logs') {
    await sh('docker', [...base, 'logs', '-f', ...services], { cwd });
    return;
  }
}
