import { Public } from '@ai-next/nestjs-shared';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { WebhookRateLimit } from './decorators/webhook-rate-limit.decorator';
import { InstagramWebhookDto, InstagramWebhookVerifyDto } from './dto/instagram-webhook.dto';
import { KakaoWebhookDto } from './dto/kakao-webhook.dto';
import { LineWebhookDto } from './dto/line-webhook.dto';
import { NaverTalkTalkWebhookDto } from './dto/naver-talktalk-webhook.dto';
import { WebhookIpWhitelistGuard } from './guards/webhook-ip-whitelist.guard';
import { WebhooksService } from './webhooks.service';

import { SkipCsrf } from '@/common/decorators/skip-csrf.decorator';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { RawBodyRequest } from '@/common/types/raw-body-request.interface';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly logger: CustomLoggerService
  ) {}

  @Public() // Kakao 서버에서 호출
  @SkipCsrf() // 외부 서버 호출이므로 CSRF 검증 제외
  @UseGuards(WebhookIpWhitelistGuard) // IP 화이트리스트 검증
  @WebhookRateLimit(100, 60) // 채널당 분당 100개 요청
  @Post('kakao/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kakao Talk 웹훅 수신' })
  @ApiParam({ name: 'channelId', description: '채널 ID' })
  async handleKakaoWebhook(
    @Param('channelId') channelId: string,
    @Body() payload: KakaoWebhookDto
  ) {
    this.logger.log(`Kakao webhook received for channel: ${channelId}`);
    return this.webhooksService.handleKakaoWebhook(channelId, payload);
  }

  @Public() // LINE 서버에서 호출
  @SkipCsrf() // 외부 서버 호출이므로 CSRF 검증 제외
  @UseGuards(WebhookIpWhitelistGuard) // IP 화이트리스트 검증
  @WebhookRateLimit(100, 60) // 채널당 분당 100개 요청
  @Post('line/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LINE 웹훅 수신' })
  @ApiParam({ name: 'channelId', description: '채널 ID' })
  async handleLineWebhook(
    @Param('channelId') channelId: string,
    @Headers('x-line-signature') signature: string,
    @Body() payload: LineWebhookDto,
    @Req() req: RawBodyRequest
  ) {
    this.logger.log(`LINE webhook received for channel: ${channelId}`);

    // LINE 시그니처 검증 (원본 raw body 사용)
    const isValid = this.webhooksService.verifyLineSignature(req.rawBody, signature);

    if (!isValid) {
      this.logger.warn('Invalid LINE signature', 'WebhooksController', {
        channelId,
        signatureProvided: !!signature,
      });
      throw new BadRequestException('Invalid signature');
    }

    return this.webhooksService.handleLineWebhook(channelId, payload);
  }

  @Public() // 네이버 서버에서 호출
  @SkipCsrf() // 외부 서버 호출이므로 CSRF 검증 제외
  @UseGuards(WebhookIpWhitelistGuard) // IP 화이트리스트 검증
  @WebhookRateLimit(100, 60) // 채널당 분당 100개 요청
  @Post('naver-talk/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '네이버 톡톡 웹훅 수신' })
  @ApiParam({ name: 'channelId', description: '채널 ID' })
  async handleNaverTalkWebhook(
    @Param('channelId') channelId: string,
    @Headers('x-naver-signature') signature: string,
    @Body() payload: NaverTalkTalkWebhookDto,
    @Req() req: RawBodyRequest
  ) {
    this.logger.log(`Naver TalkTalk webhook received for channel: ${channelId}`);

    // 네이버 톡톡 서명 검증
    const isValid = this.webhooksService.verifyNaverTalkSignature(req.rawBody, signature);

    if (!isValid) {
      this.logger.warn('Invalid Naver TalkTalk signature', 'WebhooksController', {
        channelId,
        signatureProvided: !!signature,
      });
      throw new BadRequestException('Invalid signature');
    }

    return this.webhooksService.handleNaverTalkWebhook(channelId, payload);
  }

  /**
   * Instagram 웹훅 검증 (GET 요청)
   * Meta에서 웹훅 URL 등록 시 검증용으로 호출
   */
  @Public()
  @SkipCsrf()
  @Get('instagram/:channelId')
  @ApiOperation({ summary: 'Instagram 웹훅 URL 검증' })
  @ApiParam({ name: 'channelId', description: '채널 ID' })
  @ApiQuery({ name: 'hub.mode', description: '구독 모드' })
  @ApiQuery({ name: 'hub.verify_token', description: '검증 토큰' })
  @ApiQuery({ name: 'hub.challenge', description: '챌린지 문자열' })
  async verifyInstagramWebhook(
    @Param('channelId') channelId: string,
    @Query() query: InstagramWebhookVerifyDto
  ) {
    this.logger.log(`Instagram webhook verification for channel: ${channelId}`);

    const isValid = await this.webhooksService.verifyInstagramWebhookToken(
      channelId,
      query['hub.verify_token']
    );

    if (!isValid) {
      this.logger.warn('Invalid Instagram verify token', 'WebhooksController', {
        channelId,
      });
      throw new BadRequestException('Invalid verify token');
    }

    // 검증 성공 시 challenge 값을 그대로 반환
    return query['hub.challenge'];
  }

  @Public() // Meta 서버에서 호출
  @SkipCsrf() // 외부 서버 호출이므로 CSRF 검증 제외
  @UseGuards(WebhookIpWhitelistGuard) // IP 화이트리스트 검증
  @WebhookRateLimit(100, 60) // 채널당 분당 100개 요청
  @Post('instagram/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Instagram 웹훅 수신' })
  @ApiParam({ name: 'channelId', description: '채널 ID' })
  async handleInstagramWebhook(
    @Param('channelId') channelId: string,
    @Headers('x-hub-signature-256') signature: string,
    @Body() payload: InstagramWebhookDto,
    @Req() req: RawBodyRequest
  ) {
    this.logger.log(`Instagram webhook received for channel: ${channelId}`);

    // Meta/Instagram 서명 검증 (SHA256)
    const isValid = this.webhooksService.verifyInstagramSignature(req.rawBody, signature);

    if (!isValid) {
      this.logger.warn('Invalid Instagram signature', 'WebhooksController', {
        channelId,
        signatureProvided: !!signature,
      });
      throw new BadRequestException('Invalid signature');
    }

    return this.webhooksService.handleInstagramWebhook(channelId, payload);
  }
}
