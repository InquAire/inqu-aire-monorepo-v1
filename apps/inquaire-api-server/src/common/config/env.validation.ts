import * as Joi from 'joi';

/**
 * Environment Variable Validation Schema
 *
 * Validates all environment variables at application startup.
 * Fail-fast approach: application won't start if required variables are missing or invalid.
 */
export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required()
    .messages({
      'string.uri': 'DATABASE_URL must be a valid PostgreSQL connection string',
      'any.required': 'DATABASE_URL is required',
    }),
  READ_DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .optional(),
  DB_CONNECTION_TIMEOUT: Joi.number().default(5000),
  DB_POOL_TIMEOUT: Joi.number().default(10000),
  DB_MAX_RETRIES: Joi.number().default(5),
  DB_RETRY_DELAY: Joi.number().default(3000),

  // Authentication
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters for security',
    'any.required': 'JWT_SECRET is required',
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters',
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // AI
  OPENAI_API_KEY: Joi.string()
    .allow('')
    .pattern(/^(sk-.*)?$/)
    .optional()
    .messages({
      'string.pattern.base': 'OPENAI_API_KEY must start with "sk-"',
    }),

  // Messaging Platforms (allow empty strings for development)
  KAKAO_REST_API_KEY: Joi.string().allow('').optional(),
  KAKAO_ADMIN_KEY: Joi.string().allow('').optional(),
  LINE_CHANNEL_SECRET: Joi.string().allow('').optional(),
  LINE_CHANNEL_ACCESS_TOKEN: Joi.string().allow('').optional(),

  // Webhooks
  WEBHOOK_BASE_URL: Joi.string().uri().optional(),

  // Security
  RATE_LIMIT_TTL: Joi.number().default(60000),
  RATE_LIMIT_MAX: Joi.number().default(100),
  REQUEST_SIZE_LIMIT: Joi.string().default('10mb'),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  ENABLE_FILE_LOGGING: Joi.boolean().default(false),
  LOG_SILENT: Joi.boolean().default(false),

  // Monitoring (Optional)
  SENTRY_DSN: Joi.string().uri().optional(),
  PROMETHEUS_PORT: Joi.number().port().default(9090),

  // Redis (Caching)
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TTL: Joi.number().default(300),

  // BullMQ (Job Queue)
  BULL_REDIS_HOST: Joi.string().default('localhost'),
  BULL_REDIS_PORT: Joi.number().default(6379),
  BULL_REDIS_PASSWORD: Joi.string().allow('').optional(),

  // Encryption
  ENCRYPTION_KEY: Joi.string().min(32).required().messages({
    'string.min': 'ENCRYPTION_KEY must be at least 32 characters',
    'any.required': 'ENCRYPTION_KEY is required',
  }),
});
