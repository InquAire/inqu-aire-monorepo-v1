import { sh } from '../utils/exec.js';
import { PKG_PRISMA } from '../utils/paths.js';

export async function cmdDb(
  action: 'migrate' | 'generate' | 'reset' | 'studio' | 'seed' | 'dev' | 'create' = 'migrate',
  opts?: { name?: string; env?: string }
) {
  const cwd = PKG_PRISMA;
  const env = opts?.env ? { ...process.env, NODE_ENV: opts.env } : undefined;

  if (action === 'dev') {
    const args = ['run', 'prisma:migrate'];
    await sh('pnpm', args, { cwd, env });
    return;
  }
  if (action === 'create') {
    if (!opts?.name) {
      throw new Error('Migration name is required. Use --name <migration-name>.');
    }
    await sh(
      'pnpm',
      ['prisma', 'migrate', 'dev', '--schema=./prisma/schema.prisma', '--name', opts.name],
      { cwd, env }
    );
    return;
  }
  if (action === 'migrate') {
    await sh('pnpm', ['run', 'prisma:migrate:deploy'], { cwd, env });
    return;
  }
  if (action === 'generate') {
    await sh('pnpm', ['run', 'prisma:generate'], { cwd, env });
    return;
  }
  if (action === 'reset') {
    await sh('pnpm', ['prisma', 'migrate', 'reset', '--schema=./prisma/schema.prisma'], {
      cwd,
      env,
    });
    return;
  }
  if (action === 'studio') {
    await sh('pnpm', ['run', 'prisma:studio'], { cwd, env });
    return;
  }
  if (action === 'seed') {
    await sh('pnpm', ['run', 'prisma:seed'], { cwd, env });
    return;
  }
}
