import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AiService } from './ai.service';
import { AnalyzeInquiryDto } from './dto/analyze-inquiry.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  @ApiOperation({ summary: '문의 메시지 AI 분석' })
  async analyzeInquiry(@Body() dto: AnalyzeInquiryDto) {
    return this.aiService.analyzeInquiry(dto);
  }

  @Post('generate-reply')
  @ApiOperation({ summary: 'AI 자동 답변 생성' })
  async generateReply(
    @Body()
    body: {
      message: string;
      industryType: string;
      context?: string;
    }
  ) {
    const reply = await this.aiService.generateReply(body.message, body.industryType, body.context);
    return { reply };
  }

  @Post('classify')
  @ApiOperation({ summary: '문의 분류' })
  async classifyInquiry(@Body() body: { message: string }) {
    const classification = await this.aiService.classifyInquiry(body.message);
    return { classification };
  }
}
