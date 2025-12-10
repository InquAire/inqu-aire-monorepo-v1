#!/usr/bin/env node
import { Command } from 'commander';

import { cmdBastion } from './commands/bastion';
import { cmdBootstrap } from './commands/bootstrap';
import { cmdDb } from './commands/db';
import { cmdEnv } from './commands/env';
import { cmdOpenapi } from './commands/openapi';
import { cmdStack } from './commands/stack';

const program = new Command();
program.name('ai').description('InquAire AI CLI').version('0.1.0');

program
  .command('bastion')
  .description('SSM 기반 배스천 포트 포워딩 터널 제어')
  .argument('[action]', 'start|stop|restart|status', 'status')
  .option('-c, --config <path>', '설정 파일 경로 (기본: packages/cli/config/bastion-tunnels.conf)')
  .option('--env <env>', '환경 이름 (production일 경우 bastion-tunnels-production.conf 사용)')
  .option('--runtime-dir <path>', 'PID 파일 저장 경로 (기본: ~/.cache/bastion-tunnels/run)')
  .option('--log-dir <path>', '로그 파일 저장 경로 (기본: ~/.cache/bastion-tunnels/log)')
  .action(async (action, opts) => {
    await cmdBastion(action, opts);
  });

program
  .command('env')
  .description('환경변수 유틸리티')
  .option('-c, --check', '필수 키 검사')
  .option('-t, --target <name>', '대상: api|prisma|all', 'all')
  .action(async opts => {
    await cmdEnv(opts.check ? 'check' : 'print', opts.target);
  });

program
  .command('db')
  .description('Prisma DB 작업')
  .argument('[action]', 'migrate|generate|reset|studio|seed|dev|create', 'migrate')
  .option('--name <name>', '마이그레이션 이름 (dev/create에서 사용)')
  .option('--env <env>', '환경 설정 (development|test|production)', 'development')
  .action(async (action, options) => {
    await cmdDb(action, options);
  });

program
  .command('openapi')
  .description('InquAire API Server OpenAPI 문서 관리')
  .argument('[action]', 'generate|validate|serve|all', 'all')
  .action(async action => {
    await cmdOpenapi(action);
  });

program
  .command('stack')
  .description('로컬 인프라(docker compose) - packages/infra 기준')
  .argument('[action]', 'up|down|logs', 'up')
  .option('-f, --file <path...>', 'compose 파일 경로(다중 지정 가능)')
  .option('-p, --profile <name...>', 'compose profile')
  .option('-s, --service <name...>', '특정 서비스만 대상')
  .option('--volumes', 'down 시 docker compose --volumes 적용', false)
  .option('--remove-orphans', 'down 시 docker compose --remove-orphans 적용', false)
  .action(async (action, opts) => {
    await cmdStack(action, opts);
  });

program
  .command('bootstrap')
  .description(
    '프로젝트 부트스트랩: shared 빌드, Prisma generate/build, CLI 빌드, 로컬 인프라 초기화'
  )
  .action(async () => {
    await cmdBootstrap();
  });

program.parseAsync().catch(e => {
  console.error(e);
  process.exit(1);
});
