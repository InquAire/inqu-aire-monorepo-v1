import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@/prisma';

import { AiService } from '../ai.service';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

interface AiAnalysisJobData {
  inquiryId: string;
  businessId: string;
}

@Injectable()
@Processor('ai-analysis', {
  concurrency: 5, // Process up to 5 jobs concurrently
})
export class AiAnalysisProcessor extends WorkerHost {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService
  ) {
    super();
  }

  async process(job: Job<AiAnalysisJobData>): Promise<void> {
    const { inquiryId } = job.data;

    this.logger.log(
      `Processing AI analysis job ${job.id} for inquiry ${inquiryId}`,
      'AiAnalysisProcessor'
    );

    try {
      // 1. Fetch inquiry (Read DB)
      const inquiry = await this.prisma.read.inquiry.findFirst({
        where: { id: inquiryId },
        include: {
          business: true,
        },
      });

      if (!inquiry || inquiry.deleted_at) {
        this.logger.warn(`Inquiry ${inquiryId} not found or deleted`, 'AiAnalysisProcessor');
        return;
      }

      // Skip if already analyzed
      if (inquiry.analyzed_at) {
        this.logger.log(`Inquiry ${inquiryId} already analyzed`, 'AiAnalysisProcessor');
        return;
      }

      const startTime = Date.now();

      // 2. Perform AI analysis
      const analysis = await this.aiService.analyzeInquiry({
        message: inquiry.message_text,
        industryType: inquiry.business.industry_type,
      });

      const processingTime = Date.now() - startTime;

      // 3. Update inquiry with analysis results (Write DB)
      await this.prisma.write.inquiry.update({
        where: { id: inquiryId },
        data: {
          type: analysis.type,
          summary: analysis.summary,
          extracted_info: analysis.extracted_info as Prisma.InputJsonValue,
          sentiment: analysis.sentiment,
          urgency: analysis.urgency,
          reply_text: analysis.suggested_reply,
          ai_confidence: analysis.confidence,
          ai_model: 'gpt-4o-mini',
          ai_processing_time: processingTime,
          analyzed_at: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      this.logger.log(
        `AI analysis completed for inquiry ${inquiryId} in ${processingTime}ms (Job: ${job.id})`,
        'AiAnalysisProcessor'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `AI analysis failed for inquiry ${inquiryId}: ${errorMessage}`,
        errorStack,
        'AiAnalysisProcessor'
      );

      // Re-throw to trigger job retry
      throw error;
    }
  }
}
