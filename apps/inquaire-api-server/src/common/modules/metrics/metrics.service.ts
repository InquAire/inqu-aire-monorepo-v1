import { Injectable } from '@nestjs/common';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

/**
 * Metrics Service
 *
 * Provides custom application and business metrics for Prometheus
 */
@Injectable()
export class MetricsService {
  // HTTP Request metrics
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;

  // Business metrics
  private readonly inquiriesCreatedTotal: Counter;
  private readonly inquiriesProcessedTotal: Counter;
  private readonly aiAnalysisTotal: Counter;
  private readonly aiAnalysisErrors: Counter;
  private readonly webhookEventsTotal: Counter;

  constructor() {
    // Initialize HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'inquaire_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'inquaire_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    // Initialize business metrics
    this.inquiriesCreatedTotal = new Counter({
      name: 'inquaire_inquiries_created_total',
      help: 'Total number of inquiries created',
      labelNames: ['platform', 'business_id'],
    });

    this.inquiriesProcessedTotal = new Counter({
      name: 'inquaire_inquiries_processed_total',
      help: 'Total number of inquiries processed',
      labelNames: ['status', 'business_id'],
    });

    this.aiAnalysisTotal = new Counter({
      name: 'inquaire_ai_analysis_total',
      help: 'Total number of AI analyses performed',
      labelNames: ['business_id', 'success'],
    });

    this.aiAnalysisErrors = new Counter({
      name: 'inquaire_ai_analysis_errors_total',
      help: 'Total number of AI analysis errors',
      labelNames: ['error_type', 'business_id'],
    });

    this.webhookEventsTotal = new Counter({
      name: 'inquaire_webhook_events_total',
      help: 'Total number of webhook events received',
      labelNames: ['platform', 'event_type', 'channel_id'],
    });
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number
  ): void {
    this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(durationSeconds);
  }

  /**
   * Record inquiry created
   */
  recordInquiryCreated(
    platform: 'KAKAO' | 'LINE' | 'NAVER_TALK' | 'INSTAGRAM',
    businessId: string
  ): void {
    this.inquiriesCreatedTotal.labels(platform, businessId).inc();
  }

  /**
   * Record inquiry processed
   */
  recordInquiryProcessed(status: string, businessId: string): void {
    this.inquiriesProcessedTotal.labels(status, businessId).inc();
  }

  /**
   * Record AI analysis
   */
  recordAiAnalysis(businessId: string, success: boolean): void {
    this.aiAnalysisTotal.labels(businessId, success.toString()).inc();
  }

  /**
   * Record AI analysis error
   */
  recordAiAnalysisError(errorType: string, businessId: string): void {
    this.aiAnalysisErrors.labels(errorType, businessId).inc();
  }

  /**
   * Record webhook event
   */
  recordWebhookEvent(
    platform: 'KAKAO' | 'LINE' | 'NAVER_TALK' | 'INSTAGRAM',
    eventType: string,
    channelId: string
  ): void {
    this.webhookEventsTotal.labels(platform, eventType, channelId).inc();
  }
}

/**
 * Prometheus metric providers (optional - for dependency injection)
 */
export const metricsProviders = [
  makeCounterProvider({
    name: 'inquaire_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),
  makeHistogramProvider({
    name: 'inquaire_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  }),
];
