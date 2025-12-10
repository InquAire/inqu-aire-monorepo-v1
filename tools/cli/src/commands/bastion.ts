import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ROOT } from '../utils/paths';

interface BastionOptions {
  config?: string;
  runtimeDir?: string;
  logDir?: string;
  env?: string;
}

interface RawConfig {
  bastionTarget?: string;
  awsProfile?: string;
  awsRegion?: string;
  tunnels: string[];
}

interface TunnelSpec {
  name: string;
  type: string;
  bindAddress: string;
  target: string;
  localPort: string;
  remoteHost?: string;
  remotePort: string;
  awsProfile?: string;
  awsRegion?: string;
}

function getDefaultConfigCandidates(env?: string): string[] {
  const candidates = [
    path.join(ROOT, 'tools', 'cli', 'config', 'bastion-tunnels.conf'),
    path.join(ROOT, 'scripts', 'bastion', 'bastion-tunnels.conf'),
    '/etc/bastion/tunnels.conf',
  ];

  // env 인자가 production이면 production 설정 파일을 우선순위로 추가
  if (env === 'production') {
    const productionConfig = path.join(
      ROOT,
      'tools',
      'cli',
      'config',
      'bastion-tunnels-production.conf'
    );
    // production 설정 파일을 첫 번째로 추가 (가장 높은 우선순위)
    candidates.unshift(productionConfig);
  }

  return candidates;
}

const DEFAULT_RUNTIME_DIR = path.join(os.homedir(), '.cache', 'bastion-tunnels', 'run');
const DEFAULT_LOG_DIR = path.join(os.homedir(), '.cache', 'bastion-tunnels', 'log');

type Action = 'start' | 'stop' | 'restart' | 'status';

const SUPPORTED_ACTIONS: readonly Action[] = ['start', 'stop', 'restart', 'status'];

export async function cmdBastion(action: string | undefined, options: BastionOptions) {
  const normalizedAction = normalizeAction(action);
  const configPath = resolveEffectiveConfigPath(
    options.config ?? process.env.CONFIG_FILE,
    options.env
  );
  const runtimeDir = resolvePath(
    options.runtimeDir ?? process.env.RUNTIME_DIR ?? DEFAULT_RUNTIME_DIR
  );
  const logDir = resolvePath(options.logDir ?? process.env.LOG_DIR ?? DEFAULT_LOG_DIR);

  await ensurePrerequisites(runtimeDir, logDir);
  const config = await loadConfig(configPath);

  const bastionTarget = process.env.BASTION_TARGET ?? config.bastionTarget;
  const awsProfile = process.env.AWS_PROFILE ?? config.awsProfile;
  const awsRegion = process.env.AWS_REGION ?? config.awsRegion;

  if (!bastionTarget) {
    throw new Error(`설정에서 BASTION_TARGET 값을 찾을 수 없습니다. (${configPath})`);
  }

  if (config.tunnels.length === 0) {
    throw new Error(`설정 파일에 TUNNELS 정의가 비어 있습니다. (${configPath})`);
  }

  const tunnels = config.tunnels.map(spec =>
    parseTunnelSpec(spec, {
      bastionTarget,
      awsProfile,
      awsRegion,
    })
  );

  switch (normalizedAction) {
    case 'start':
      await startAll(tunnels, runtimeDir, logDir);
      break;
    case 'stop':
      await stopAll(tunnels, runtimeDir);
      break;
    case 'status':
      await statusAll(tunnels, runtimeDir);
      break;
    case 'restart':
      await stopAll(tunnels, runtimeDir);
      await delay(1000);
      await startAll(tunnels, runtimeDir, logDir);
      break;
  }
}

function normalizeAction(action?: string): Action {
  if (!action) {
    return 'status';
  }
  if ((SUPPORTED_ACTIONS as readonly string[]).includes(action)) {
    return action as Action;
  }
  throw new Error(
    `지원하지 않는 action 입니다: ${action} (사용 가능: ${SUPPORTED_ACTIONS.join(', ')})`
  );
}

function resolvePath(target: string): string {
  const expanded = target.startsWith('~') ? path.join(os.homedir(), target.slice(1)) : target;
  return path.resolve(expanded);
}

async function ensurePrerequisites(runtimeDir: string, logDir: string) {
  if (!commandExists('aws')) {
    throw new Error('aws CLI 를 찾을 수 없습니다. 설치 후 다시 시도하세요.');
  }
  if (!commandExists('session-manager-plugin')) {
    console.warn(
      '[WARN] session-manager-plugin 을 찾을 수 없습니다. start-session 명령이 실패할 수 있습니다.'
    );
  }
  await fs.promises.mkdir(runtimeDir, { recursive: true });
  await fs.promises.mkdir(logDir, { recursive: true });
}

function commandExists(command: string): boolean {
  const bin = process.platform === 'win32' ? 'where' : 'which';
  const child = spawnSync(bin, [command], { stdio: 'ignore' });
  return child.status === 0;
}

async function loadConfig(configPath: string): Promise<RawConfig> {
  try {
    const raw = await fs.promises.readFile(configPath, 'utf8');
    const bastionTarget = extractVariable(raw, 'BASTION_TARGET');
    const awsProfile = extractVariable(raw, 'AWS_PROFILE');
    const awsRegion = extractVariable(raw, 'AWS_REGION');
    const tunnels = extractTunnels(raw, configPath);
    return {
      bastionTarget: bastionTarget ?? undefined,
      awsProfile: awsProfile ?? undefined,
      awsRegion: awsRegion ?? undefined,
      tunnels,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`설정 파일을 찾을 수 없습니다: ${configPath}`);
    }
    throw error;
  }
}

function extractVariable(content: string, key: string): string | null {
  const regex = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.+)$`, 'm');
  const match = content.match(regex);
  if (!match) {
    return null;
  }
  let value = match[1].trim();
  value = value.replace(/;$/, '').trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function extractTunnels(content: string, configPath: string): string[] {
  const match = content.match(/declare\s+-a\s+TUNNELS=\(([\s\S]*?)\)/);
  if (!match) {
    throw new Error(`설정 파일에서 TUNNELS 배열을 찾을 수 없습니다. (${configPath})`);
  }
  const inner = match[1];
  const tunnels: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'/g;
  let found: RegExpExecArray | null;
  while ((found = regex.exec(inner)) !== null) {
    const value = (found[1] ?? found[2] ?? '').trim();
    if (value.length > 0) {
      tunnels.push(value);
    }
  }
  return tunnels;
}

interface ParseDefaults {
  bastionTarget: string;
  awsProfile?: string;
  awsRegion?: string;
}

function parseTunnelSpec(spec: string, defaults: ParseDefaults): TunnelSpec {
  const tokens = tokenize(spec);
  const record: Record<string, string> = {};
  for (const token of tokens) {
    const eq = token.indexOf('=');
    if (eq === -1) {
      throw new Error(`잘못된 터널 정의입니다: '${spec}'`);
    }
    const key = token.slice(0, eq);
    const rawValue = token.slice(eq + 1);
    record[key] = stripQuotes(rawValue);
  }

  const name = record['name'];
  if (!name) {
    throw new Error(`터널 정의에 name이 필요합니다: '${spec}'`);
  }

  const type = record['type'] ?? 'local';
  const bindAddress = record['bind_address'] ?? '127.0.0.1';
  const target = record['target'] ?? defaults.bastionTarget;
  const localPort = record['local_port'];
  const remotePort = record['remote_port'];
  const remoteHost = record['remote_host'];
  const awsProfile = record['aws_profile'] ?? defaults.awsProfile;
  const awsRegion = record['aws_region'] ?? defaults.awsRegion;

  if (!localPort) {
    throw new Error(`터널 ${name} 에 local_port 값이 필요합니다.`);
  }
  if (!remotePort) {
    throw new Error(`터널 ${name} 에 remote_port 값이 필요합니다.`);
  }
  if (!target) {
    throw new Error(`터널 ${name} 에서 SSM 대상 인스턴스(target)를 결정할 수 없습니다.`);
  }

  return {
    name,
    type,
    bindAddress,
    target,
    localPort,
    remoteHost,
    remotePort,
    awsProfile,
    awsRegion,
  };
}

function tokenize(spec: string): string[] {
  const tokens = spec.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
  if (!tokens) {
    return [];
  }
  return tokens;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function resolveEffectiveConfigPath(explicit?: string, env?: string): string {
  if (explicit) {
    return resolvePath(explicit);
  }

  // 환경 변수 변경 가능성을 고려하여 매번 후보 목록을 다시 생성
  const candidates = getDefaultConfigCandidates(env);
  for (const candidate of candidates) {
    const resolved = resolvePath(candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  const lastCandidate = candidates[candidates.length - 1];
  return resolvePath(lastCandidate);
}

async function startAll(tunnels: TunnelSpec[], runtimeDir: string, logDir: string) {
  let status = 0;
  for (const tunnel of tunnels) {
    try {
      await startTunnel(tunnel, runtimeDir, logDir);
    } catch (error) {
      status = 1;
      console.warn(`[WARN] ${String(error instanceof Error ? error.message : error)}`);
    }
  }
  if (status !== 0) {
    throw new Error('일부 터널을 시작하지 못했습니다.');
  }
}

async function startTunnel(tunnel: TunnelSpec, runtimeDir: string, logDir: string) {
  if (tunnel.type && tunnel.type !== 'local') {
    throw new Error(`SSM 포워딩은 'local' 타입만 지원합니다 (${tunnel.name}).`);
  }

  if (
    tunnel.bindAddress &&
    tunnel.bindAddress !== '127.0.0.1' &&
    tunnel.bindAddress !== 'localhost'
  ) {
    console.warn(
      `[WARN] bind_address=${tunnel.bindAddress} 는 무시됩니다. Session Manager는 127.0.0.1로만 바인딩합니다 (${tunnel.name}).`
    );
  }

  const safeName = sanitizeName(tunnel.name);
  const pidFile = path.join(runtimeDir, `${safeName}.pid`);
  const logFile = path.join(logDir, `${safeName}.log`);

  if (await isProcessAlive(pidFile)) {
    console.info(`[INFO] 터널 '${tunnel.name}' 이미 실행 중 (${pidFile})`);
    return;
  }

  const { command, env } = buildSsmCommand(tunnel);
  console.info(`[INFO] 터널 시작: ${tunnel.name}`);
  console.info(`[INFO]   -> aws ssm start-session --target ${tunnel.target} ...`);
  console.info(`[INFO]   로그 파일: ${logFile}`);

  await fs.promises.mkdir(path.dirname(logFile), { recursive: true });
  const shellCommand = `(${command}) >> "$PK_BASTION_LOG_FILE" 2>&1`;
  const child = spawn('bash', ['-c', shellCommand], {
    env: { ...process.env, ...env, PK_BASTION_LOG_FILE: logFile },
    detached: true,
    stdio: 'ignore',
  });

  child.unref();

  await delay(1000);

  if (child.pid && process.kill(child.pid, 0)) {
    await fs.promises.writeFile(pidFile, String(child.pid), 'utf8');
    console.info(
      `[INFO] 터널 '${tunnel.name}' 실행 중 (PID ${child.pid}). 로그: tail -f ${logFile}`
    );
  } else {
    throw new Error(`터널 '${tunnel.name}' 시작에 실패했습니다. 로그를 확인하세요: ${logFile}`);
  }
}

function buildSsmCommand(tunnel: TunnelSpec): { command: string; env: Record<string, string> } {
  const parameters: Record<string, string[]> = {
    localPortNumber: [String(tunnel.localPort)],
    portNumber: [String(tunnel.remotePort)],
  };

  let documentName = 'AWS-StartPortForwardingSession';
  if (tunnel.remoteHost) {
    documentName = 'AWS-StartPortForwardingSessionToRemoteHost';
    parameters.host = [tunnel.remoteHost];
  }

  const env: Record<string, string> = {
    PK_BASTION_TARGET: tunnel.target,
    PK_BASTION_DOCUMENT: documentName,
    PK_BASTION_PARAMETERS: JSON.stringify(parameters),
  };

  if (tunnel.awsProfile) {
    env.AWS_PROFILE = tunnel.awsProfile;
  }
  if (tunnel.awsRegion) {
    env.AWS_REGION = tunnel.awsRegion;
  }

  const command =
    'aws ssm start-session --target "$PK_BASTION_TARGET" --document-name "$PK_BASTION_DOCUMENT" --parameters "$PK_BASTION_PARAMETERS"';
  return { command, env };
}

async function stopAll(tunnels: TunnelSpec[], runtimeDir: string) {
  for (const tunnel of tunnels) {
    await stopTunnel(tunnel, runtimeDir);
  }
}

async function stopTunnel(tunnel: TunnelSpec, runtimeDir: string) {
  const safeName = sanitizeName(tunnel.name);
  const pidFile = path.join(runtimeDir, `${safeName}.pid`);

  if (!(await isProcessAlive(pidFile))) {
    console.info(`[INFO] 터널 '${tunnel.name}' 는 실행 중이 아닙니다.`);
    await safeUnlink(pidFile);
    return;
  }

  const pid = await readPid(pidFile);
  if (!pid) {
    await safeUnlink(pidFile);
    return;
  }

  console.info(`[INFO] 터널 중지: ${tunnel.name}`);
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    console.warn(`[WARN] 프로세스 종료 중 오류 발생 (PID ${pid}): ${String(error)}`);
  }

  await waitForExit(pid, 3000);
  await safeUnlink(pidFile);
}

async function statusAll(tunnels: TunnelSpec[], runtimeDir: string) {
  for (const tunnel of tunnels) {
    const safeName = sanitizeName(tunnel.name);
    const pidFile = path.join(runtimeDir, `${safeName}.pid`);
    if (await isProcessAlive(pidFile)) {
      const pid = await readPid(pidFile);
      console.log(`[RUNNING] ${tunnel.name}${pid ? ` (PID ${pid})` : ''}`);
    } else {
      console.log(`[STOPPED] ${tunnel.name}`);
    }
  }
}

async function isProcessAlive(pidFile: string): Promise<boolean> {
  const pid = await readPid(pidFile);
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readPid(pidFile: string): Promise<number | null> {
  try {
    const content = await fs.promises.readFile(pidFile, 'utf8');
    const pid = parseInt(content.trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function safeUnlink(filePath: string) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

async function waitForExit(pid: number, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!isPidRunning(pid)) {
      return;
    }
    await delay(200);
  }
  if (isPidRunning(pid)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // ignore
    }
  }
}

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
