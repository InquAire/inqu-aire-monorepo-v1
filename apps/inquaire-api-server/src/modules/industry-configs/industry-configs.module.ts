import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';

import { IndustryConfigsService } from './industry-configs.service';
import { IndustryConfigsController } from './industry-configs.controller';

@Module({
  imports: [PrismaModule],
  controllers: [IndustryConfigsController],
  providers: [IndustryConfigsService],
  exports: [IndustryConfigsService],
})
export class IndustryConfigsModule {}
