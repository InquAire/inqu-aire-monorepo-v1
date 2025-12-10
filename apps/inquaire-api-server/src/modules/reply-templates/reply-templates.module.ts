import { Module } from '@nestjs/common';

import { ReplyTemplatesService } from './reply-templates.service';
import { ReplyTemplatesController } from './reply-templates.controller';

@Module({
  controllers: [ReplyTemplatesController],
  providers: [ReplyTemplatesService],
  exports: [ReplyTemplatesService],
})
export class ReplyTemplatesModule {}
