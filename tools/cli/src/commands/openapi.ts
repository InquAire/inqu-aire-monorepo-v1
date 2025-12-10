import fs from 'node:fs';

import { bold, cyan, green, red, yellow } from 'kleur/colors';

import { sh } from '../utils/exec';
import { OPENAPI_DOCS_DIR, OPENAPI_JSON, PKG_API } from '../utils/paths';

type OpenapiAction = 'generate' | 'validate' | 'serve' | 'all';

/**
 * OpenAPI 문서 관리 (InquAire API Server)
 */
export async function cmdOpenapi(action: OpenapiAction = 'all') {
  console.log(cyan('\n📚 InquAire API Server - OpenAPI 문서 관리\n'));

  // 1) OpenAPI JSON 생성
  if (action === 'generate' || action === 'all') {
    console.log(yellow('━━━ OpenAPI 문서 생성 ━━━\n'));

    // NestJS 앱을 부트스트랩하여 OpenAPI JSON 생성
    await sh('pnpm', ['run', 'openapi:generate'], { cwd: PKG_API });

    // 생성 확인
    if (fs.existsSync(OPENAPI_JSON)) {
      console.log(green(`✅ OpenAPI JSON 생성 완료: ${OPENAPI_JSON}\n`));

      // 생성된 파일 목록
      const files = fs.readdirSync(OPENAPI_DOCS_DIR).filter(f => f.endsWith('.json'));
      console.log(bold('생성된 파일:'));
      files.forEach(f => console.log(`  - ${f}`));
      console.log();
    } else {
      console.error(red('❌ OpenAPI JSON 생성 실패\n'));
      process.exit(1);
    }
  }

  // 2) OpenAPI 검증
  if (action === 'validate' || action === 'all') {
    console.log(yellow('━━━ OpenAPI 문서 검증 ━━━\n'));

    if (!fs.existsSync(OPENAPI_JSON)) {
      console.error(red(`❌ OpenAPI JSON 파일을 찾을 수 없습니다: ${OPENAPI_JSON}`));
      console.error(yellow('먼저 "ai openapi generate"를 실행하세요.\n'));
      process.exit(1);
    }

    try {
      await sh('npx', ['-y', '@apidevtools/swagger-cli@4.0.4', 'validate', OPENAPI_JSON], {
        cwd: PKG_API,
      });
      console.log(green('✅ OpenAPI 문서 검증 완료\n'));
    } catch {
      console.error(red('❌ OpenAPI 문서 검증 실패\n'));
      process.exit(1);
    }
  }

  // 3) Swagger UI 서버 실행
  if (action === 'serve') {
    console.log(yellow('━━━ Swagger UI 서버 실행 ━━━\n'));
    console.log(cyan('개발 서버를 실행합니다...\n'));
    console.log(green('📚 Swagger UI: http://localhost:3000/api/docs\n'));

    await sh('pnpm', ['start:dev'], { cwd: PKG_API });
  }

  if (action === 'all') {
    console.log(green('\n✅ OpenAPI 작업 완료!\n'));
    console.log(bold('다음 단계:'));
    console.log('  - Swagger UI 확인: ai openapi serve');
    console.log('  - JSON 파일 위치: docs/api/openapi.json');
    console.log();
  }
}
