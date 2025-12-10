import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';

import { InquiryRepliesService } from './inquiry-replies.service';
import { InquiryRepliesController } from './inquiry-replies.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InquiryRepliesController],
  providers: [InquiryRepliesService],
  exports: [InquiryRepliesService],
})
export class InquiryRepliesModule {}
