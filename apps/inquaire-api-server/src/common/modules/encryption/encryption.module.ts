import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EncryptionService } from './encryption.service';

/**
 * 암호화 모듈
 *
 * API Key 및 민감한 데이터 암호화 서비스를 제공합니다.
 * @Global 데코레이터로 전역 모듈로 설정되어 모든 모듈에서 import 없이 사용 가능
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
