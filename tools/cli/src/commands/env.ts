import { bold, cyan, gray, red } from 'kleur/colors';

import { loadMergedEnv } from '../utils/env';
import { ROOT } from '../utils/paths';
import { apiEnvSchema } from '../validators/api-env';
import { prismaEnvSchema } from '../validators/prisma-env';

type Target = 'api' | 'prisma' | 'all';

export async function cmdEnv(action: 'print' | 'check' = 'print', target: Target = 'all') {
  const env = loadMergedEnv(ROOT);
  if (action === 'print') {
    console.log(bold(cyan('• Effective ENV (merged):')));
    for (const k of Object.keys(env).sort()) {
      const v = env[k]!;
      const masked = /SECRET|PASSWORD|KEY|TOKEN/i.test(k) ? '***' : v;
      console.log(`${gray(k)}=${masked}`);
    }
    return;
  }

  // check
  if (target === 'api' || target === 'all') {
    const parsed = apiEnvSchema.safeParse(env);
    if (!parsed.success) {
      console.log(red('Invalid API env configuration:'));
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.') || '(root)';
        console.log(red(` - ${path}: ${issue.message}`));
      }
      process.exit(1);
    }
  }

  if (target === 'prisma' || target === 'all') {
    const parsed = prismaEnvSchema.safeParse(env);
    if (!parsed.success) {
      console.log(red('Invalid Prisma env configuration:'));
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.') || '(root)';
        console.log(red(` - ${path}: ${issue.message}`));
      }
      process.exit(1);
    }
  }

  console.log(cyan(`ENV check OK (${target})`));
}
