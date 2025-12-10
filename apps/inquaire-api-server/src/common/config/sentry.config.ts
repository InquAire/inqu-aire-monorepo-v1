import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Sentry Configuration
 *
 * Error tracking and performance monitoring for production
 */
export function initializeSentry(dsn?: string): void {
  if (!dsn) {
    console.log('📊 Sentry DSN not configured - error tracking disabled');
    return;
  }

  const environment = process.env.NODE_ENV || 'development';

  Sentry.init({
    dsn,
    environment,

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive request data
      if (event.request?.data) {
        if (typeof event.request.data === 'object' && event.request.data !== null) {
          const sanitized = { ...event.request.data } as Record<string, unknown>;
          const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'cardNumber', 'cvv'];

          sensitiveFields.forEach(field => {
            if (field in sanitized) {
              sanitized[field] = '***REDACTED***';
            }
          });

          event.request.data = sanitized;
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'NavigationDuplicated',
      'Non-Error exception captured',
      'Non-Error promise rejection captured',
    ],

    // Release tracking (optional)
    release: process.env.npm_package_version
      ? `inquaire-api-server@${process.env.npm_package_version}`
      : undefined,
  });

  console.log(`✅ Sentry initialized (environment: ${environment})`);
}
