import { IndustryType } from '@/prisma';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import OpenAI from 'openai';

import { AnalysisResult, AnalyzeInquiryDto } from './dto/analyze-inquiry.dto';

import {
  CircuitBreakerService,
  OPENAI_CIRCUIT_BREAKER_CONFIG,
} from '@/common/modules/circuit-breaker';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly openai: OpenAI | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    // Only initialize OpenAI if API key is available
    // This allows OpenAPI spec generation without requiring all API keys
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.openai = null;
      this.logger.warn(
        'OpenAI API key not configured - AI features will be unavailable',
        'AiService'
      );
    }
  }

  /**
   * 문의 메시지 분석
   */
  async analyzeInquiry(dto: AnalyzeInquiryDto): Promise<AnalysisResult> {
    if (!this.openai) {
      throw new Error(
        'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
      );
    }

    const startTime = Date.now();

    try {
      // 1. 산업별 시스템 프롬프트 가져오기
      const systemPrompt = await this.getSystemPrompt(dto.industryType);

      // 2. OpenAI API 호출 (Circuit Breaker로 보호)
      const callOpenAI = async () => {
        return await this.openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: dto.message,
            },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        });
      };

      const response = await this.circuitBreaker
        .wrap(callOpenAI, OPENAI_CIRCUIT_BREAKER_CONFIG)
        .fire();

      const aiResponse = response.choices[0].message.content;
      if (!aiResponse) {
        throw new Error('OpenAI returned empty response');
      }
      const analysis = JSON.parse(aiResponse);

      // 3. 결과 구조화
      const result: AnalysisResult = {
        type: analysis.type || '일반 문의',
        summary: analysis.summary || dto.message.substring(0, 100),
        extracted_info: analysis.extracted_info || {},
        sentiment: analysis.sentiment || 'neutral',
        urgency: analysis.urgency || 'medium',
        suggested_reply: analysis.suggested_reply || '',
        confidence: analysis.confidence || 0.8,
      };

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `AI analysis completed in ${processingTime}ms with confidence ${result.confidence}`
      );

      // ✅ Sentry: 성공 컨텍스트 기록 (에러 발생 시 함께 전송됨)
      Sentry.setContext('ai_analysis', {
        industry: dto.industryType,
        sentiment: result.sentiment,
        urgency: result.urgency,
        confidence: result.confidence,
        processing_time_ms: processingTime,
        status: 'success',
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`AI analysis failed: ${errorMessage}`, errorStack);

      // ❌ Sentry: 에러 캡처 (컨텍스트 포함)
      Sentry.setContext('ai_analysis', {
        industry: dto.industryType,
        processing_time_ms: Date.now() - startTime,
        status: 'error',
        error_type: error instanceof Error ? error.name : 'UnknownError',
      });

      Sentry.captureException(error, {
        tags: {
          module: 'ai',
          operation: 'analyze_inquiry',
          industry: dto.industryType,
        },
        level: 'error',
      });

      // 에러 발생 시 기본 응답 반환
      return {
        type: '일반 문의',
        summary: dto.message.substring(0, 100),
        extracted_info: {},
        sentiment: 'neutral',
        urgency: 'medium',
        suggested_reply: '문의해 주셔서 감사합니다. 담당자 확인 후 빠르게 답변 드리겠습니다.',
        confidence: 0.5,
      };
    }
  }

  /**
   * 산업별 시스템 프롬프트 가져오기
   */
  private async getSystemPrompt(industryType: string): Promise<string> {
    // 1. DB에서 산업별 설정 가져오기
    const config = await this.prisma.read.industryConfig.findUnique({
      where: { industry: industryType as IndustryType },
    });

    if (config?.system_prompt) {
      return config.system_prompt;
    }

    // 2. 기본 프롬프트 반환
    return this.getDefaultSystemPrompt(industryType);
  }

  /**
   * 산업별 기본 시스템 프롬프트
   */
  private getDefaultSystemPrompt(industryType: string): string {
    const baseInstruction = `당신은 ${industryType === 'HOSPITAL' ? '병원' : industryType === 'REAL_ESTATE' ? '부동산' : '비즈니스'} 상담 AI 어시스턴트입니다.
고객 문의를 분석하고 구조화된 정보를 추출하여 JSON 형식으로 반환하세요.`;

    switch (industryType) {
      case 'HOSPITAL':
      case 'DENTAL':
      case 'DERMATOLOGY':
      case 'PLASTIC_SURGERY':
        return `${baseInstruction}

다음 정보를 추출하세요:
- type: 문의 유형 (예약 문의, 가격 문의, 시술 문의, 일반 문의)
- summary: 문의 내용 요약 (1-2 문장)
- extracted_info: {
    desired_date: 희망 예약 날짜 (YYYY-MM-DD 형식),
    desired_time: 희망 예약 시간 (오전/오후/저녁),
    treatment_name: 시술/치료 이름,
    concern: 주요 고민/증상,
    customer_name: 고객 이름,
    contact: 연락처,
    age: 나이,
    additional_info: 추가 정보
  }
- sentiment: 감정 분석 (positive/neutral/negative)
- urgency: 긴급도 (high/medium/low)
- suggested_reply: 추천 답변 (친절하고 전문적인 톤으로 1-2 문장)
- confidence: 분석 신뢰도 (0-1 사이 숫자)

응답은 반드시 유효한 JSON 형식이어야 합니다.`;

      case 'REAL_ESTATE':
        return `${baseInstruction}

다음 정보를 추출하세요:
- type: 문의 유형 (매물 문의, 가격 문의, 방문 예약, 일반 문의)
- summary: 문의 내용 요약 (1-2 문장)
- extracted_info: {
    property_type: 매물 유형 (아파트/빌라/오피스텔/상가 등),
    location: 희망 지역,
    budget: 예산,
    desired_date: 방문 희망 날짜,
    rooms: 방 개수,
    customer_name: 고객 이름,
    contact: 연락처,
    additional_requirements: 추가 요구사항
  }
- sentiment: 감정 분석 (positive/neutral/negative)
- urgency: 긴급도 (high/medium/low)
- suggested_reply: 추천 답변 (친절하고 전문적인 톤으로 1-2 문장)
- confidence: 분석 신뢰도 (0-1 사이 숫자)

응답은 반드시 유효한 JSON 형식이어야 합니다.`;

      default:
        return `${baseInstruction}

다음 정보를 추출하세요:
- type: 문의 유형
- summary: 문의 내용 요약 (1-2 문장)
- extracted_info: 추출된 주요 정보 (객체 형태)
- sentiment: 감정 분석 (positive/neutral/negative)
- urgency: 긴급도 (high/medium/low)
- suggested_reply: 추천 답변 (친절하고 전문적인 톤으로 1-2 문장)
- confidence: 분석 신뢰도 (0-1 사이 숫자)

응답은 반드시 유효한 JSON 형식이어야 합니다.`;
    }
  }

  /**
   * 자동 답변 생성
   */
  async generateReply(
    messageText: string,
    industryType: string,
    context?: string
  ): Promise<string> {
    if (!this.openai) {
      return '문의해 주셔서 감사합니다. 담당자 확인 후 빠르게 답변 드리겠습니다.';
    }

    try {
      const systemPrompt = `당신은 ${industryType === 'HOSPITAL' ? '병원' : industryType === 'REAL_ESTATE' ? '부동산' : '비즈니스'} 상담원입니다.
고객의 문의에 대해 친절하고 전문적으로 답변하세요.
답변은 2-3 문장으로 간결하게 작성하고, 필요한 경우 추가 정보를 요청하세요.`;

      const userMessage = context
        ? `${context}\n\n고객 문의: ${messageText}`
        : `고객 문의: ${messageText}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const content = response.choices[0].message.content;
      return content || '문의해 주셔서 감사합니다. 담당자 확인 후 빠르게 답변 드리겠습니다.';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Reply generation failed: ${errorMessage}`);
      return '문의해 주셔서 감사합니다. 담당자 확인 후 빠르게 답변 드리겠습니다.';
    }
  }

  /**
   * 문의 분류
   */
  async classifyInquiry(messageText: string): Promise<string> {
    if (!this.openai) {
      return '일반';
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `다음 문의를 분류하세요: 예약, 가격, 일반, 불만, 긴급
응답은 한 단어로만 하세요.`,
          },
          {
            role: 'user',
            content: messageText,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      const content = response.choices[0].message.content;
      return content ? content.trim() : '일반';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Classification failed: ${errorMessage}`);
      return '일반';
    }
  }
}
