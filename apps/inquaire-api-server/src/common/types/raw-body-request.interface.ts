import type { Request } from 'express';

/**
 * Express Request with raw body buffer
 *
 * Used for webhook signature verification where the exact raw body
 * is needed before JSON parsing
 */
export interface RawBodyRequest extends Request {
  rawBody: Buffer;
}
