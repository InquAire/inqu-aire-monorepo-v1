export const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'auth',
  'credential',
  'apiKey',
  'accessToken',
  'refreshToken',
  'jwt',
  'bearer',
] as const;

export type SensitiveKey = (typeof DEFAULT_SENSITIVE_KEYS)[number];

export function deepMask<T>(obj: T, sensitiveKeys: readonly string[] = DEFAULT_SENSITIVE_KEYS): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return redactTokensInString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepMask(item, sensitiveKeys)) as T;
  }

  if (typeof obj === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitiveKey =>
        lowerKey.includes(sensitiveKey.toLowerCase())
      );

      if (isSensitive) {
        masked[key] = '[REDACTED]';
      } else {
        masked[key] = deepMask(value, sensitiveKeys);
      }
    }
    return masked as T;
  }

  return obj;
}

export function redactTokensInString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }

  // JWT token pattern (3 parts separated by dots)
  str = str.replace(/[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[JWT_TOKEN]');

  // Bearer token pattern
  str = str.replace(/Bearer\s+[A-Za-z0-9-_]+/gi, 'Bearer [TOKEN]');

  // API key pattern (long alphanumeric strings)
  str = str.replace(/[A-Za-z0-9]{32,}/g, '[API_KEY]');

  // Email pattern (keep domain, mask local part)
  str = str.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[EMAIL]@$2');

  // Phone number pattern
  str = str.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');

  // Credit card pattern
  str = str.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');

  return str;
}
