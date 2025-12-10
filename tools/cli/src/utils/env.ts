import fs from 'node:fs';
import path from 'node:path';

import { parse } from 'dotenv';
import dotenvExpand from 'dotenv-expand';

type Dict = Record<string, string>;

function loadFile(filePath: string): Dict {
  if (!fs.existsSync(filePath)) return {};
  const parsed = parse(fs.readFileSync(filePath));
  const expanded = dotenvExpand.expand({ parsed }).parsed ?? parsed;
  return expanded as Dict;
}

function loadRootEnv(cwd: string, nodeEnv = process.env.NODE_ENV ?? 'development'): Dict {
  const files = ['.env', '.env.local', `.env.${nodeEnv}`, `.env.${nodeEnv}.local`].map(f =>
    path.join(cwd, f)
  );

  const merged: Dict = {};
  for (const f of files) Object.assign(merged, loadFile(f));
  return merged;
}

export function loadMergedEnv(rootDir: string): Dict {
  const rootEnv = loadRootEnv(rootDir);
  for (const [k, v] of Object.entries(rootEnv)) {
    if (!(k in process.env)) {
      process.env[k] = v;
    }
  }

  const apiEnv = loadApiEnv(path.join(rootDir, 'apps', 'api-server'));

  const merged: Dict = { ...rootEnv, ...apiEnv };
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') merged[k] = v;
  }

  return merged;
}

function loadApiEnv(apiRoot: string): Dict {
  const NODE_ENV = process.env.NODE_ENV ?? 'development';
  const candidates = [
    path.join(apiRoot, 'envs/.env'),
    path.join(apiRoot, 'envs/.env.local'),
    path.join(apiRoot, `envs/.env.${NODE_ENV}`),
    path.join(apiRoot, `envs/.env.${NODE_ENV}.local`),
  ];

  const merged: Dict = {};
  for (const file of candidates) {
    Object.assign(merged, loadFile(file));
  }

  for (const [k, v] of Object.entries(merged)) {
    if (!(k in process.env)) {
      process.env[k] = v;
    }
  }

  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') merged[k] = v;
  }

  return merged;
}
