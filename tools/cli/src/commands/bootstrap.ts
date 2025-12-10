import fs from 'node:fs';
import path from 'node:path';

import { bold, cyan } from 'kleur/colors';

import { sh } from '../utils/exec';
import { ROOT } from '../utils/paths';

import { cmdStack } from './stack';

// Bootstrap steps mirror root script (minus install):
// 1) build @ai-next/nestjs-shared
// 2) reset local infra stack (docker compose down/up)
// 3) ensure api-server env is configured
// 4) prisma generate (@ai-next/inquaire-api-server)
// 5) build ai-cli (self)
// 6) prisma migrate deploy
export async function cmdBootstrap() {
  console.log(bold(cyan('• Bootstrap: shared build → infra reset → prisma generate → cli build')));

  // 1) shared build
  await sh('pnpm', ['--filter', '@ai-next/nestjs-shared', 'run', 'build'], { cwd: ROOT });

  // 2) reset local infra stack to avoid stale containers/volumes (before prisma generate)
  console.log(
    bold(cyan('• Reset local infra stack (docker compose down --volumes --remove-orphans)'))
  );
  await cmdStack('down', { volumes: true, removeOrphans: true });
  await cmdStack('up');

  // 3) ensure api-server/.env exists (defaults aligned with docker-compose)
  const pgHost = process.env.POSTGRES_HOST ?? 'localhost';
  const pgPort = process.env.POSTGRES_PORT ?? '5432';
  const pgUser = process.env.POSTGRES_USER ?? 'postgres';
  const pgPassword = process.env.POSTGRES_PASSWORD ?? 'postgres';
  const pgDb = process.env.POSTGRES_DB ?? 'inquaire';
  const prismaSchema = process.env.PRISMA_SCHEMA ?? 'public';

  const prismaEnvScript = path.join(
    ROOT,
    'scripts',
    'deploy',
    'api-server-ecs',
    'prepare-prisma-env.sh'
  );
  const dbUrl =
    process.env.DATABASE_URL ??
    `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDb}?schema=${prismaSchema}`;
  const shadowUrl =
    process.env.SHADOW_DATABASE_URL ??
    `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/shadow?schema=${prismaSchema}`;

  console.log(bold(cyan('• Ensure api-server/.env is generated')));
  await sh('bash', [prismaEnvScript, dbUrl, shadowUrl], { cwd: ROOT });

  // 3-1) ensure apps/api-server/envs/.env.development.local exists
  const apiEnvDir = path.join(ROOT, 'apps', 'api-server', 'envs');
  const apiEnvTarget = path.join(apiEnvDir, '.env.development.local');
  const apiEnvTemplate = path.join(
    ROOT,
    'tools',
    'cli',
    'templates',
    'api-server.env.development.local'
  );

  if (!fs.existsSync(apiEnvDir)) {
    fs.mkdirSync(apiEnvDir, { recursive: true });
  }

  if (!fs.existsSync(apiEnvTarget) && fs.existsSync(apiEnvTemplate)) {
    fs.copyFileSync(apiEnvTemplate, apiEnvTarget);
    console.log(bold(cyan('• Created apps/api-server/envs/.env.development.local from template')));
  }

  const defaultGoogleCredsPath = path.join(apiEnvDir, 'google-stt.json');
  const gcpEnvCreds = process.env.GOOGLE_STT_CREDENTIALS;
  const gcpAppCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const gcpCredSource =
    gcpEnvCreds ??
    gcpAppCreds ??
    (fs.existsSync(defaultGoogleCredsPath) ? defaultGoogleCredsPath : null);

  if (gcpCredSource) {
    let credentialsContent: string | null = null;
    let sourceDescription = '';

    const resolveFromPath = (filePath: string): string | null => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        sourceDescription = `file ${path.relative(ROOT, filePath)}`;
        console.log(bold(cyan(`• Loaded Google STT credentials from ${sourceDescription}`)));
        return content;
      } catch (error) {
        console.warn(
          `[bootstrap] Failed to read credentials file (${filePath}). Falling back to raw value.`,
          error
        );
        return null;
      }
    };

    if (gcpEnvCreds) {
      if (fs.existsSync(gcpEnvCreds)) {
        credentialsContent = resolveFromPath(gcpEnvCreds);
      }
      if (credentialsContent === null) {
        credentialsContent = gcpEnvCreds;
        sourceDescription = 'GOOGLE_STT_CREDENTIALS environment value';
        console.log(
          bold(
            cyan(
              '• Using GOOGLE_STT_CREDENTIALS environment value (ensure it is JSON or base64-encoded JSON)'
            )
          )
        );
      }
    } else if (gcpAppCreds) {
      if (fs.existsSync(gcpAppCreds)) {
        credentialsContent = resolveFromPath(gcpAppCreds);
      }
      if (credentialsContent === null) {
        credentialsContent = gcpAppCreds;
        sourceDescription = 'GOOGLE_APPLICATION_CREDENTIALS raw value';
        console.log(
          bold(
            cyan(
              '• Using GOOGLE_APPLICATION_CREDENTIALS raw value for GOOGLE_STT_CREDENTIALS (ensure it is JSON or base64 JSON)'
            )
          )
        );
      }
    } else if (fs.existsSync(defaultGoogleCredsPath)) {
      credentialsContent = resolveFromPath(defaultGoogleCredsPath);
    }

    if (credentialsContent !== null) {
      const encodedCredentials = Buffer.from(credentialsContent, 'utf8').toString('base64');
      try {
        const envContent = fs.readFileSync(apiEnvTarget, 'utf8');
        const lines = envContent.split(/\r?\n/);
        let replaced = false;
        const newLines = lines.map(line => {
          if (line.startsWith('GOOGLE_STT_CREDENTIALS=')) {
            replaced = true;
            return `GOOGLE_STT_CREDENTIALS=${encodedCredentials}`;
          }
          return line;
        });

        if (!replaced) {
          newLines.push(`GOOGLE_STT_CREDENTIALS=${encodedCredentials}`);
        }

        fs.writeFileSync(apiEnvTarget, newLines.join('\n'), 'utf8');
        console.log(
          bold(
            cyan(
              `• GOOGLE_STT_CREDENTIALS injected into .env.development.local${
                sourceDescription ? ` (source: ${sourceDescription})` : ''
              }`
            )
          )
        );
      } catch (error) {
        console.warn('[bootstrap] Failed to inject GOOGLE_STT_CREDENTIALS', error);
      }
    }
  }

  // 4) prisma generate
  await sh('pnpm', ['--filter', '@ai-next/inquaire-api-server', 'run', 'prisma:generate'], {
    cwd: ROOT,
  });

  // 5) cli build (optional but keeps dist current)
  await sh('pnpm', ['--filter', 'ai-cli', 'run', 'build'], { cwd: ROOT });

  // 6) prisma migrate deploy
  await sh('pnpm', ['--filter', '@ai-next/inquaire-api-server', 'run', 'prisma:migrate:deploy'], {
    cwd: ROOT,
  });
}
