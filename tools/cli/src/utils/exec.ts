import { execa } from 'execa';

export async function sh(
  cmd: string,
  args: string[],
  opts: { cwd?: string; stdio?: 'inherit' | 'pipe'; env?: NodeJS.ProcessEnv } = {}
) {
  const c = await execa(cmd, args, {
    stdio: opts.stdio ?? 'inherit',
    cwd: opts.cwd,
    env: opts.env,
  });
  return c.exitCode;
}
